import { projectFileService } from '../services/projectFile.service.js'
import { AppError, catchAsync } from '../middleware/error.js'
import { invalidatePreview } from '../services/preview/service.js'

/**
 * Express stores splat (*) path segments in req.params[0] (numeric key).
 * Normalize it into a `filePath` field for the rest of the handler.
 */
function filePathFromParams(req) {
  return req.params[0] ?? req.params.filePath
}

export const projectFileController = {
  list: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const files = await projectFileService.listFiles(projectId, req.user.id)
    res.json({ success: true, data: { files } })
  }),

  get: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const filePath = filePathFromParams(req)
    const file = await projectFileService.getFile(projectId, filePath, req.user.id)
    res.json({ success: true, data: { file } })
  }),

  create: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const { path, content, type, expectedRevisionId } = req.validatedBody || req.body
    const file = await projectFileService.createFile(projectId, req.user.id, {
      path,
      content,
      type,
    }, expectedRevisionId)
    invalidatePreview(projectId)
    res.status(201).json({ success: true, data: { file } })
  }),

  update: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const filePath = filePathFromParams(req)
    const { content, expectedRevisionId } = req.validatedBody || req.body
    const file = await projectFileService.updateFile(
      projectId,
      filePath,
      req.user.id,
      { content, expectedRevisionId }
    )
    invalidatePreview(projectId)
    res.json({ success: true, data: { file } })
  }),

  delete: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const filePath = filePathFromParams(req)
    const { expectedRevisionId } = req.validatedQuery || req.query
    const result = await projectFileService.deleteFile(
      projectId,
      filePath,
      req.user.id,
      expectedRevisionId
    )
    invalidatePreview(projectId)
    res.json({ success: true, data: result })
  }),

  rename: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const filePath = filePathFromParams(req)
    const { newPath, expectedRevisionId } = req.validatedBody || req.body
    const file = await projectFileService.renameFile(
      projectId,
      filePath,
      req.user.id,
      { newPath },
      expectedRevisionId
    )
    invalidatePreview(projectId)
    res.json({ success: true, data: { file } })
  }),

  move: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const filePath = filePathFromParams(req)
    const { newPath, expectedRevisionId } = req.validatedBody || req.body
    const file = await projectFileService.moveFile(
      projectId,
      filePath,
      req.user.id,
      { newPath },
      expectedRevisionId
    )
    invalidatePreview(projectId)
    res.json({ success: true, data: { file } })
  }),
}

export default projectFileController
