import { Router } from 'express'
import { generationController } from '../controllers/generation.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  generateProjectSchema,
  modifyProjectSchema,
  generationJobIdParamSchema,
} from '../validators/generation.validators.js'

const router = Router()

// All generation routes require authentication
router.post(
  '/generate',
  protect,
  validate({ body: generateProjectSchema }),
  generationController.generate
)

router.post(
  '/generate/async',
  protect,
  validate({ body: generateProjectSchema }),
  generationController.generateAsync
)

router.post(
  '/modify',
  protect,
  validate({ body: modifyProjectSchema }),
  generationController.modify
)

router.get(
  '/jobs/:jobId',
  protect,
  validate({ params: generationJobIdParamSchema }),
  generationController.getJob
)

router.get(
  '/stream/:jobId',
  protect,
  validate({ params: generationJobIdParamSchema }),
  generationController.stream
)

export default router
