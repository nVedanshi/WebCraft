import { prisma } from '../lib/prisma.js'

/**
 * UserRepository — data access for the User model.
 *
 * Keeps all Prisma queries for users in one place so business logic in
 * services stays free of persistence details. Returns plain objects; never
 * exposes passwordHash to callers.
 */
export class UserRepository {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, credits: true, reservedCredits: true,
        tier: true, emailVerified: true, createdAt: true, updatedAt: true,
      },
    })
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } })
  }

  async findByEmailWithPassword(email) {
    return prisma.user.findUnique({ where: { email } })
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, credits: true, reservedCredits: true,
        tier: true, emailVerified: true, updatedAt: true,
      },
    })
  }

  async changePassword(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true, updatedAt: true },
    })
  }

  async list({ take = 20, cursor }) {
    return prisma.user.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, credits: true, tier: true, createdAt: true,
      },
    })
  }

  async count() {
    return prisma.user.count()
  }
}

export const userRepository = new UserRepository()
export default userRepository
