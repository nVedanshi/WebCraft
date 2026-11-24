/**
 * DeploymentController — HTTP handlers for the draft/published/deployment lifecycle.
 *
 * Endpoints:
 *   POST   /deployments/:projectId/publish        - publish draft
 *   POST   /deployments/:projectId/republish      - republish draft
 *   POST   /deployments/:projectId/unpublish      - unpublish
 *   GET    /deployments/:projectId/history        - deployment history
 *   GET    /deployments/:projectId/status         - current live deployment
 *   POST   /deployments/:projectId/rollback/:versionId - rollback to version
 *   GET    /deployments/:projectId/versions       - list version snapshots
 */

import { deploymentService } from '../services/deployment/service.js'
import { projectService } from '../services/project.service.js'
import { projectFileService } from '../services/projectFile.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

export const deploymentController = {
  /**
   * Publish a draft project.
   */
  publish: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const { commitMessage } = req.validatedBody || req.body
    const result = await deploymentService.publish(req.user.id, projectId, {
      commitMessage,
    })
    res.status(201).json({
      success: true,
      data: {
        deployment: result.deployment,
        project: result.project,
        version: result.version,
        buildResult: result.buildResult,
      },
    })
  }),

  /**
   * Republish a project (new snapshot from current draft).
   */
  republish: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const { commitMessage } = req.validatedBody || req.body
    const result = await deploymentService.republish(req.user.id, projectId, {
      commitMessage,
    })
    res.json({
      success: true,
      data: {
        deployment: result.deployment,
        project: result.project,
        version: result.version,
        buildResult: result.buildResult,
      },
    })
  }),

  /**
   * Unpublish a project (clear published flag, keep draft).
   */
  unpublish: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const result = await deploymentService.unpublish(req.user.id, projectId)
    res.json({
      success: true,
      data: { project: result.project },
    })
  }),

  /**
   * Get deployment history for a project.
   */
  getHistory: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const result = await deploymentService.getDeploymentHistory(req.user.id, projectId)
    res.json({
      success: true,
      data: result,
    })
  }),

  /**
   * Get current live deployment status.
   */
  getStatus: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const result = await deploymentService.getDeploymentStatus(req.user.id, projectId)
    res.json({
      success: true,
      data: result,
    })
  }),

  /**
   * Rollback to a previous version.
   */
  rollback: catchAsync(async (req, res) => {
    const { projectId, versionId } = req.validatedParams || req.params
    const result = await deploymentService.rollback(req.user.id, projectId, versionId)
    res.json({
      success: true,
      data: {
        deployment: result.deployment,
        project: result.project,
      },
    })
  }),

  /**
   * List version snapshots for a project.
   */
  listVersions: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const project = await projectService.getProject(req.user.id, projectId)
    const versions = await prisma.projectVersion.findMany({
      where: { projectId },
      select: {
        id: true, label: true, fileCount: true, totalSize: true,
        createdAt: true, createdBy: true, revisionId: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      success: true,
      data: { versions, project },
    })
  }),
}

import { prisma } from '../lib/prisma.js'

export default deploymentController
