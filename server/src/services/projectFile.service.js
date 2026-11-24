import { projectFileRepository } from '../repositories/projectFile.repository.js'
import { projectRepository } from '../repositories/project.repository.js'
import { validateFilePath } from '../repositories/projectFile.repository.js'
import { AppError } from '../middleware/error.js'
import { prisma } from '../lib/prisma.js'
import { randomUUID } from 'crypto'

/**
 * ProjectFileService — business logic for project file operations.
 *
 * Supports create, read, update, delete, rename, and move. Enforces:
 *   - Project ownership
 *   - Path traversal prevention
 *   - Revision concurrency (optimistic locking via revisionId)
 *   - Unique path within a project
 *
 * Every mutating file operation runs inside a Prisma transaction so the file
 * change and the project revision bump are atomic. This prevents two clients
 * from interleaving writes and silently losing changes.
 *
 * File contents are stored inline in the `ProjectFile.content` column for the
 * MVP (simple, understandable, transactional). Large files can be moved to
 * object storage later.
 */
export class ProjectFileService {
  async listFiles(projectId, userId) {
    const project = await projectRepository.findByIdAndUser(projectId, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    return projectFileRepository.listByProject(projectId)
  }

  async getFile(projectId, path, userId) {
    await this._assertProjectAccess(projectId, userId)
    const safePath = validateFilePath(path)
    const file = await projectFileRepository.findByProjectAndPath(
      projectId,
      safePath
    )
    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found')
    }
    return file
  }

  async createFile(projectId, userId, { path, content, type }, expectedRevisionId) {
    await this._assertProjectAccess(projectId, userId, expectedRevisionId)
    const safePath = validateFilePath(path)
    const existing = await projectFileRepository.findByProjectAndPath(
      projectId,
      safePath
    )
    if (existing) {
      throw new AppError(409, 'FILE_ALREADY_EXISTS', 'File already exists at this path')
    }

    const result = await prisma.$transaction(async (tx) => {
      const file = await tx.projectFile.create({
        data: {
          projectId,
          path: safePath,
          content: content ?? '',
          type: type ?? 'file',
          size: Buffer.byteLength(content ?? '', 'utf8'),
        },
        select: {
          id: true, projectId: true, path: true, type: true, size: true,
          mimeType: true, content: true, createdAt: true, updatedAt: true,
        },
      })
      await tx.project.update({
        where: { id: projectId },
        data: { revisionId: randomUUID() },
      })
      return file
    })

    return result
  }

  async updateFile(projectId, path, userId, { content, expectedRevisionId }) {
    await this._assertProjectAccess(projectId, userId, expectedRevisionId)
    const safePath = validateFilePath(path)
    const file = await projectFileRepository.findByProjectAndPath(
      projectId,
      safePath
    )
    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found')
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectFile.update({
        where: { id: file.id },
        data: { content, size: Buffer.byteLength(content, 'utf8') },
        select: {
          id: true, projectId: true, path: true, type: true, size: true,
          mimeType: true, content: true, updatedAt: true,
        },
      })
      await tx.project.update({
        where: { id: projectId },
        data: { revisionId: randomUUID() },
      })
      return updated
    })

    return result
  }

  async deleteFile(projectId, path, userId, expectedRevisionId) {
    await this._assertProjectAccess(projectId, userId, expectedRevisionId)
    const safePath = validateFilePath(path)
    const file = await projectFileRepository.findByProjectAndPath(
      projectId,
      safePath
    )
    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found')
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectFile.delete({ where: { id: file.id } })
      await tx.project.update({
        where: { id: projectId },
        data: { revisionId: randomUUID() },
      })
    })

    return { deleted: true, path: safePath }
  }

  async renameFile(projectId, path, userId, { newPath }, expectedRevisionId) {
    await this._assertProjectAccess(projectId, userId, expectedRevisionId)
    const safePath = validateFilePath(path)
    const safeNewPath = validateFilePath(newPath)
    const file = await projectFileRepository.findByProjectAndPath(
      projectId,
      safePath
    )
    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File not found')
    }

    // Check target doesn't already exist
    const target = await projectFileRepository.findByProjectAndPath(
      projectId,
      safeNewPath
    )
    if (target) {
      throw new AppError(409, 'FILE_ALREADY_EXISTS', 'Target path already exists')
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectFile.update({
        where: { id: file.id },
        data: { path: safeNewPath },
        select: {
          id: true, projectId: true, path: true, type: true, size: true,
          mimeType: true, updatedAt: true,
        },
      })
      await tx.project.update({
        where: { id: projectId },
        data: { revisionId: randomUUID() },
      })
      return updated
    })

    return result
  }

  async moveFile(projectId, path, userId, { newPath }, expectedRevisionId) {
    // Move is the same operation as rename within this flat file model
    return this.renameFile(projectId, path, userId, { newPath: newPath }, expectedRevisionId)
  }

  async _assertProjectAccess(projectId, userId, expectedRevisionId) {
    const project = await projectRepository.findByIdAndUser(projectId, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    if (project.status === 'DELETED') {
      throw new AppError(410, 'PROJECT_DELETED', 'Project has been deleted')
    }
    if (expectedRevisionId !== undefined && project.revisionId !== expectedRevisionId) {
      throw new AppError(
        409,
        'REVISION_CONFLICT',
        'Project has been modified by another client. Reload and retry.'
      )
    }
    return project
  }
}

export const projectFileService = new ProjectFileService()
export default projectFileService
