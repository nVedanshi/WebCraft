import { Router } from 'express'
import { projectController } from '../controllers/project.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  listProjectsSchema,
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
} from '../validators/project.validators.js'

const router = Router()

// All project routes require authentication
router.get(
  '/',
  protect,
  validate({ query: listProjectsSchema }),
  projectController.list
)
router.post(
  '/',
  protect,
  validate({ body: createProjectSchema }),
  projectController.create
)
router.get(
  '/:id',
  protect,
  validate({ params: projectIdParamSchema }),
  projectController.get
)
router.patch(
  '/:id',
  protect,
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  projectController.update
)
router.delete(
  '/:id',
  protect,
  validate({ params: projectIdParamSchema }),
  projectController.delete
)
router.post(
  '/:id/archive',
  protect,
  validate({ params: projectIdParamSchema }),
  projectController.archive
)

export default router
