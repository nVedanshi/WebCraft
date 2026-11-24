import { Router } from 'express'
import { templateController } from '../controllers/template.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  templateIdParamSchema,
  listTemplatesSchema,
  useTemplateSchema,
} from '../validators/template.validators.js'

const router = Router()

// Public catalog — read-only, no auth required
router.get(
  '/',
  validate({ query: listTemplatesSchema }),
  templateController.list
)

router.get(
  '/categories',
  templateController.categories
)

router.get(
  '/:templateId',
  validate({ params: templateIdParamSchema }),
  templateController.get
)

// Create a project from a template — requires authentication
router.post(
  '/:templateId/use',
  protect,
  validate({ params: templateIdParamSchema, body: useTemplateSchema }),
  templateController.use
)

export default router
