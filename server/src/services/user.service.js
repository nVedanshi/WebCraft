import bcrypt from 'bcryptjs'

import { prisma } from '../lib/prisma.js'
import { userRepository } from '../repositories/user.repository.js'
import { AppError } from '../middleware/error.js'

const SALT_ROUNDS = 12

/**
 * UserService — business logic for user profile and account management.
 *
 * Handles password hashing, ownership enforcement, and validation that a
 * requested user exists. No HTTP or Express concepts here.
 */
export class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }
    return user
  }

  async updateProfile(userId, { name }) {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }
    return userRepository.update(userId, { name })
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const full = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    })
    if (!full) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const valid = await bcrypt.compare(currentPassword, full.passwordHash)
    if (!valid) {
      throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect')
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await userRepository.changePassword(userId, passwordHash)
    return { changed: true }
  }
}

export const userService = new UserService()
export default userService
