import { userService } from '../services/user.service.js'
import { authService } from '../services/auth.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

export const userController = {
  me: catchAsync(async (req, res) => {
    const user = await userService.getProfile(req.user.id)
    res.json({ success: true, data: { user } })
  }),

  updateProfile: catchAsync(async (req, res) => {
    const { name } = req.validatedBody || req.body
    const user = await userService.updateProfile(req.user.id, { name })
    res.json({ success: true, data: { user } })
  }),

  changePassword: catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody || req.body
    await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    })
    res.json({ success: true, data: { changed: true } })
  }),

  deleteAccount: catchAsync(async (req, res) => {
    const { password, confirmDelete } = req.validatedBody || req.body
    const result = await authService.deleteAccount({
      userId: req.user.id,
      password,
      confirmDelete,
    })
    res.json({ success: true, data: result })
  }),

  exportData: catchAsync(async (req, res) => {
    const data = await authService.exportData(req.user.id)
    res.json({ success: true, data })
  }),
}

export default userController
