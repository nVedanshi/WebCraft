import { projectRepository } from '../repositories/project.repository.js'
import { AppError } from '../middleware/error.js'
import { randomUUID } from 'crypto'

/**
 * ProjectService — business logic for project lifecycle.
 *
 * Enforces ownership (a user only touches their own projects), soft-delete
 * semantics, and revision concurrency. No HTTP concepts here.
 */
export class ProjectService {
  async listProjects(userId, { status, take, cursor }) {
    return projectRepository.listByUser(userId, { status, take, cursor })
  }

  async createProject(userId, { name, description, settings = {} }) {
    return projectRepository.create({
      userId,
      name,
      description,
      settings,
    })
  }

  async getProject(userId, id) {
    const project = await projectRepository.findByIdAndUser(id, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    if (project.status === 'DELETED') {
      throw new AppError(410, 'PROJECT_DELETED', 'Project has been deleted')
    }
    return project
  }

  async updateProject(userId, id, { name, description }, expectedRevisionId) {
    const project = await projectRepository.findByIdAndUser(id, userId)
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
    return projectRepository.update(id, { name, description, revisionId: randomUUID() })
  }

  async deleteProject(userId, id) {
    const project = await projectRepository.findByIdAndUser(id, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    return projectRepository.softDelete(id)
  }

  async archiveProject(userId, id) {
    const project = await projectRepository.findByIdAndUser(id, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }
    return projectRepository.archive(id)
  }
}

export const projectService = new ProjectService()
export default projectService
