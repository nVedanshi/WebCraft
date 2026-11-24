import { projectService } from '../services/project.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

export const projectController = {
  list: catchAsync(async (req, res) => {
    const { status } = req.validatedQuery || req.query
    const take = req.validatedQuery?.take
      ? parseInt(req.validatedQuery.take, 10)
      : undefined
    const cursor = (req.validatedQuery || req.query).cursor
    const projects = await projectService.listProjects(req.user.id, {
      status,
      take,
      cursor,
    })
    res.json({ success: true, data: { projects } })
  }),

  create: catchAsync(async (req, res) => {
    const { name, description } = req.validatedBody || req.body
    const project = await projectService.createProject(req.user.id, {
      name,
      description,
    })
    res.status(201).json({ success: true, data: { project } })
  }),

  get: catchAsync(async (req, res) => {
    const { id } = req.validatedParams || req.params
    const project = await projectService.getProject(req.user.id, id)
    res.json({ success: true, data: { project } })
  }),

  update: catchAsync(async (req, res) => {
    const { id } = req.validatedParams || req.params
    const { name, description, expectedRevisionId } = req.validatedBody || req.body
    const project = await projectService.updateProject(req.user.id, id, {
      name,
      description,
    }, expectedRevisionId)
    res.json({ success: true, data: { project } })
  }),

  delete: catchAsync(async (req, res) => {
    const { id } = req.validatedParams || req.params
    await projectService.deleteProject(req.user.id, id)
    res.json({ success: true, data: { deleted: true } })
  }),

  archive: catchAsync(async (req, res) => {
    const { id } = req.validatedParams || req.params
    const project = await projectService.archiveProject(req.user.id, id)
    res.json({ success: true, data: { project } })
  }),
}

export default projectController
