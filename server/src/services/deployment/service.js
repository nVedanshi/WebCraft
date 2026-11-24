/**
 * DeploymentService — business logic for the draft/published/deployment lifecycle.
 *
 * Every project distinguishes:
 *   - Draft: the editable working copy (project.files + project.revisionId)
 *   - Published snapshot: an immutable ProjectVersion + Deployment record
 *
 * Editing the draft never changes the currently published version. A
 * successful publish creates an immutable snapshot of the project at that
 * point in time, builds it, deploys it, and serves it at a stable URL.
 *
 * Security:
 *   - Builds run in an isolated sandbox (DeploymentAdapter)
 *   - Deployed apps never execute inside the main Express process
 *   - Only static files from the build output are served
 *   - Ownership enforced server-side on every operation
 */

import { prisma } from '../../lib/prisma.js'
import { randomUUID } from 'crypto'
import { AppError } from '../../middleware/error.js'
import { config } from '../../config/index.js'
import { projectFileService } from '../projectFile.service.js'
import { projectService } from '../project.service.js'
import { deploymentAdapter } from './adapter.js'

// In-memory cache of deployed build artifacts: deploymentId => { success, buildDir, error }
// Used by the Express static middleware to serve deployed files.
const deploymentBuildCache = new Map()

export { deploymentBuildCache }

// Deployments are served from the adapter build dir via Express static middleware
// mounted in app.js at /api/v1/deploy/:deploymentId/:restOfPath

export class DeploymentService {
  /**
   * Publish a project: create an immutable snapshot, build it, deploy it.
   *
   * Steps:
   *   1. Verify project ownership and that it's not DELETED
   *   2. Build the draft in a sandbox (npm install + npm run build)
   *   3. Create a ProjectVersion snapshot with full file contents
   *   4. Create a Deployment record (status: BUILDING)
   *   5. On build success: mark LIVE, set deploymentUrl, update project
   *   6. On build failure: mark FAILED, record error
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} options
   * @param {string} [options.commitMessage]
   * @returns {Promise<{success, deployment, project}>}
   */
  async publish(userId, projectId, { commitMessage } = {}) {
    return prisma.$transaction(async (tx) => {
      // ── Step 1: Verify project ownership ──
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { files: true },
      })
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
      }
      if (project.status === 'DELETED') {
        throw new AppError(410, 'PROJECT_DELETED', 'Project has been deleted')
      }

      const files = project.files || []
      if (files.length === 0) {
        throw new AppError(400, 'NO_FILES', 'Project has no files to publish')
      }

      // ── Step 2: Build the draft in sandbox ──
      const fileList = files.map((f) => ({
        path: f.path,
        content: f.content || '',
      }))

      const buildResult = await deploymentAdapter.buildSnapshot(projectId, fileList)

      // ── Step 3: Create version snapshot (immutable) ──
      const totalSize = files.reduce((sum, f) => sum + Buffer.byteLength(f.content || '', 'utf8'), 0)
      const snapshot = {}
      for (const f of files) {
        snapshot[f.path] = {
          content: f.content || '',
          type: f.type || 'file',
          size: Buffer.byteLength(f.content || '', 'utf8'),
          mimeType: f.mimeType,
        }
      }

      const version = await tx.projectVersion.create({
        data: {
          projectId,
          revisionId: project.revisionId,
          label: commitMessage || `Publish ${new Date().toISOString()}`,
          createdBy: userId,
          fileCount: files.length,
          totalSize,
          snapshot,
        },
      })

      // ── Step 4: Create deployment record ──
      const deploymentId = randomUUID()
      const deploymentUrl = `${config.clientUrl}/deploy/${deploymentId}`

      // Cache the build directory for static file serving
      if (buildResult.success && buildResult.buildDir) {
        deploymentBuildCache.set(deploymentId, {
          success: true,
          buildDir: buildResult.buildDir,
        })
      } else {
        deploymentBuildCache.set(deploymentId, {
          success: false,
          buildDir: null,
          error: buildResult.error,
        })
      }

      const deployment = await tx.deployment.create({
        data: {
          id: deploymentId,
          projectId,
          userId,
          versionId: version.id,
          url: deploymentUrl,
          status: buildResult.success ? 'LIVE' : 'FAILED',
          fileCount: files.length,
          totalSize,
          buildLogs: buildResult.errors
            ? JSON.stringify(buildResult.errors)
            : null,
          error: buildResult.error || null,
          deployedAt: buildResult.success ? new Date() : null,
        },
      })

      // ── Step 5: Update project to published ──
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'PUBLISHED',
          isPublished: buildResult.success,
          publishedAt: buildResult.success ? new Date() : null,
          deploymentUrl: buildResult.success ? deploymentUrl : null,
          draftRevisionId: project.revisionId, // snapshot the draft revision
          publishedRevisionId: project.revisionId, // this revision is now published
        },
      })

      return {
        success: buildResult.success,
        deployment,
        project: updatedProject,
        version,
        buildResult,
      }
    })
  }

  /**
   * Republish a project: create a new snapshot from the current draft,
   * build it, and update the deployment to point at the new version.
   * The previous deployment record is preserved for rollback.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} options
   * @param {string} [options.commitMessage]
   * @returns {Promise<{success, deployment, project}>}
   */
  async republish(userId, projectId, { commitMessage } = {}) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { files: true, deployments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
      }
      if (project.status === 'DELETED') {
        throw new AppError(410, 'PROJECT_DELETED', 'Project has been deleted')
      }

      const files = project.files || []
      if (files.length === 0) {
        throw new AppError(400, 'NO_FILES', 'Project has no files to publish')
      }

      // Build the current draft
      const fileList = files.map((f) => ({
        path: f.path,
        content: f.content || '',
      }))

      const buildResult = await deploymentAdapter.buildSnapshot(projectId, fileList)

      // Create new version snapshot
      const totalSize = files.reduce((sum, f) => sum + Buffer.byteLength(f.content || '', 'utf8'), 0)
      const snapshot = {}
      for (const f of files) {
        snapshot[f.path] = {
          content: f.content || '',
          type: f.type || 'file',
          size: Buffer.byteLength(f.content || '', 'utf8'),
          mimeType: f.mimeType,
        }
      }

      const version = await tx.projectVersion.create({
        data: {
          projectId,
          revisionId: project.revisionId,
          label: commitMessage || `Republish ${new Date().toISOString()}`,
          createdBy: userId,
          fileCount: files.length,
          totalSize,
          snapshot,
        },
      })

      // Mark previous deployment as rolled back (superseded)
      await tx.deployment.updateMany({
        where: { projectId, status: 'LIVE' },
        data: { status: 'ROLLED_BACK' },
      })

      // Create new deployment
      const deploymentId = randomUUID()
      const deploymentUrl = `${config.clientUrl}/deploy/${deploymentId}`

      // Cache the build directory for static file serving
      if (buildResult.success && buildResult.buildDir) {
        deploymentBuildCache.set(deploymentId, {
          success: true,
          buildDir: buildResult.buildDir,
        })
      } else {
        deploymentBuildCache.set(deploymentId, {
          success: false,
          buildDir: null,
          error: buildResult.error,
        })
      }

      const deployment = await tx.deployment.create({
        data: {
          id: deploymentId,
          projectId,
          userId,
          versionId: version.id,
          url: deploymentUrl,
          status: buildResult.success ? 'LIVE' : 'FAILED',
          fileCount: files.length,
          totalSize,
          buildLogs: buildResult.errors ? JSON.stringify(buildResult.errors) : null,
          error: buildResult.error || null,
          deployedAt: buildResult.success ? new Date() : null,
        },
      })

      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'PUBLISHED',
          isPublished: buildResult.success,
          publishedAt: buildResult.success ? new Date() : project.publishedAt,
          deploymentUrl: buildResult.success ? deploymentUrl : project.deploymentUrl,
          draftRevisionId: project.revisionId,
          publishedRevisionId: buildResult.success ? project.revisionId : project.publishedRevisionId,
        },
      })

      return {
        success: buildResult.success,
        deployment,
        project: updatedProject,
        version,
        buildResult,
      }
    })
  }

  /**
   * Unpublish a project: mark the deployment as rolled back and clear
   * the project's published flag. The snapshot and deployment record
   * are preserved for potential re-publish.
   *
   * @param {string} userId
   * @param {string} projectId
   * @returns {Promise<{project}>}
   */
  async unpublish(userId, projectId) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
      })
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
      }

      // Mark live deployment as rolled back
      await tx.deployment.updateMany({
        where: { projectId, status: 'LIVE' },
        data: { status: 'ROLLED_BACK' },
      })

      // Clear published flag on project (draft remains intact)
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'ACTIVE',
          isPublished: false,
          publishedAt: null,
          deploymentUrl: null,
          publishedRevisionId: null,
        },
      })

      return { project: updatedProject }
    })
  }

  /**
   * Rollback a project to a previous deployment version.
   * Creates a new deployment pointing at the old version snapshot.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {string} versionId - the version to roll back to
   * @returns {Promise<{deployment, project}>}
   */
  async rollback(userId, projectId, versionId) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { deployments: { where: { status: 'LIVE' } } },
      })
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
      }

      // Verify the version exists and belongs to this project
      const version = await tx.projectVersion.findUnique({
        where: { id: versionId, projectId },
      })
      if (!version) {
        throw new AppError(404, 'VERSION_NOT_FOUND', 'Deployment version not found')
      }

      // Mark current live deployment as rolled back
      await tx.deployment.updateMany({
        where: { projectId, status: 'LIVE' },
        data: { status: 'ROLLED_BACK' },
      })

      // Create new deployment pointing at the old version
      const deploymentId = randomUUID()
      const deploymentUrl = `${config.clientUrl}/deploy/${deploymentId}`

      const deployment = await tx.deployment.create({
        data: {
          id: deploymentId,
          projectId,
          userId,
          versionId: version.id,
          url: deploymentUrl,
          status: 'LIVE',
          fileCount: version.fileCount,
          totalSize: version.totalSize,
          deployedAt: new Date(),
        },
      })

      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'PUBLISHED',
          isPublished: true,
          publishedAt: new Date(),
          deploymentUrl,
          publishedRevisionId: version.revisionId,
        },
      })

      return { deployment, project: updatedProject }
    })
  }

  /**
   * Get deployment history for a project.
   *
   * @param {string} userId
   * @param {string} projectId
   * @returns {Promise<{deployments, project}>}
   */
  async getDeploymentHistory(userId, projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    if (project.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
    }

    const deployments = await prisma.deployment.findMany({
      where: { projectId },
      include: {
        version: {
          select: {
            id: true, label: true, fileCount: true, totalSize: true, createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { deployments, project }
  }

  /**
   * Get deployment status (for serving the deployed app or checking status).
   *
   * @param {string} userId
   * @param {string} projectId
   * @returns {Promise<{deployment, project}>}
   */
  async getDeploymentStatus(userId, projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    if (project.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Project does not belong to this user')
    }

    const deployment = await prisma.deployment.findFirst({
      where: { projectId, status: 'LIVE' },
      include: {
        version: {
          select: {
            id: true, label: true, fileCount: true, totalSize: true, createdAt: true,
          },
        },
      },
    })

    return { deployment, project }
  }
}

export const deploymentService = new DeploymentService()
export default DeploymentService
