/**
 * PreviewController — handles preview build status and error reporting.
 *
 * The actual file serving is done by Express static middleware mounted in
 * app.js, pointing at the build directory returned by the preview service.
 */
import { getPreview, getPreviewError, invalidatePreview } from '../services/preview/service.js'
import { projectFileService } from '../services/projectFile.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

export const previewController = {
  /**
   * Get the build status of a project's preview.
   * Returns success if the preview is ready to serve, or error details if it failed.
   */
  status: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const userId = req.user.id
    const result = await getPreviewError(projectId, userId)
    if (!result.success) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', result.error || 'Project not found')
    }
    res.json({ success: true, data: result })
  }),

  /**
   * Rebuild the preview for a project (triggered after save or generation).
   */
  rebuild: catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const userId = req.user.id

    // Verify project access
    const project = await projectFileService._assertProjectAccess(projectId, userId)
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    }

    // Invalidate cache so next status check rebuilds
    invalidatePreview(projectId)

    // Trigger a build
    const files = await projectFileService.listFiles(projectId, userId)
    const fileList = files.map((f) => ({ path: f.path, content: f.content || '' }))
    const result = await buildPreview(projectId, fileList)

    res.json({
      success: result.success,
      data: {
        buildSuccess: result.success,
        error: result.error,
        errors: result.errors,
        message: result.message,
      },
    })
  }),
}

export default previewController
