import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.validators.js'

const router = Router()

// Public
router.post('/register', validate({ body: registerSchema }), authController.register)
router.post('/login', validate({ body: loginSchema }), authController.login)
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh)

// Password reset (public, rate-limited)
router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
)
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
)

// Email verification (public)
router.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail,
)
router.post(
  '/resend-verification',
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
)

// Protected
router.post('/logout', protect, authController.logout)
router.get('/me', protect, authController.me)

export default router
