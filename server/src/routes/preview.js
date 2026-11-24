import { Router } from 'express'
import { previewController } from '../controllers/preview.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { projectIdParamSchema } from '../validators/project.validators.js'

const router = Router()

// Preview routes require authentication
router.get(
  '/preview/:projectId/status',
  protect,
  validate({ params: projectIdParamSchema }),
  previewController.status
)

router.post(
  '/preview/:projectId/rebuild',
  protect,
  validate({ params: projectIdParamSchema }),
  previewController.rebuild
)

export default router
