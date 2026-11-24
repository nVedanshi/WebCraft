import { Router } from 'express'
import { projectFileController } from '../controllers/projectFile.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  projectIdParamSchema,
  filePathParamSchema,
  createFileSchema,
  updateFileSchema,
  deleteFileQuerySchema,
  renameFileSchema,
  moveFileSchema,
} from '../validators/projectFile.validators.js'

const router = Router()

// All file routes require authentication
router.get(
  '/:projectId/files',
  protect,
  validate({ params: projectIdParamSchema }),
  projectFileController.list
)
router.get(
  '/:projectId/files/*',
  protect,
  validate({ params: filePathParamSchema }),
  projectFileController.get
)
router.post(
  '/:projectId/files',
  protect,
  validate({ params: projectIdParamSchema, body: createFileSchema }),
  projectFileController.create
)
router.put(
  '/:projectId/files/*',
  protect,
  validate({ params: filePathParamSchema, body: updateFileSchema }),
  projectFileController.update
)
router.delete(
  '/:projectId/files/*',
  protect,
  validate({ params: filePathParamSchema, query: deleteFileQuerySchema }),
  projectFileController.delete
)
router.patch(
  '/:projectId/files/*',
  protect,
  validate({ params: filePathParamSchema, body: renameFileSchema }),
  projectFileController.rename
)

export default router
