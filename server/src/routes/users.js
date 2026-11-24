import { Router } from 'express'
import { userController } from '../controllers/user.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/user.validators.js'
import { deleteAccountSchema } from '../validators/auth.validators.js'

const router = Router()

// All user routes require authentication
router.get('/me', protect, userController.me)
router.patch('/me', protect, validate({ body: updateProfileSchema }), userController.updateProfile)
router.post('/me/password', protect, validate({ body: changePasswordSchema }), userController.changePassword)
router.delete('/me', protect, validate({ body: deleteAccountSchema }), userController.deleteAccount)
router.get('/export', protect, userController.exportData)

export default router
