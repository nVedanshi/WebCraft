import { prisma } from '../lib/prisma.js'
import { randomUUID } from 'crypto'

/**
 * ProjectRepository — data access for Project and related file/version models.
 *
 * All persistence for projects lives here. Services call these methods and
 * enforce business rules (ownership, revision concurrency, soft-delete).
 */
export class ProjectRepository {
  async create(data) {
    return prisma.project.create({
      data,
      select: {
        id: true, userId: true, name: true, description: true, status: true,
        revisionId: true, settings: true, createdAt: true, updatedAt: true,
      },
    })
  }

  async findById(id) {
    return prisma.project.findUnique({
      where: { id },
      select: {
        id: true, userId: true, name: true, description: true, status: true,
        revisionId: true, settings: true, createdAt: true, updatedAt: true,
        archivedAt: true, deletedAt: true,
        _count: { select: { files: true, versions: true, generationJobs: true } },
      },
    })
  }

  async listByUser(userId, { take = 20, cursor, status }) {
    return prisma.project.findMany({
      where: { userId, ...(status ? { status } : {}) },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, userId: true, name: true, description: true, status: true,
        revisionId: true, settings: true, createdAt: true, updatedAt: true,
        archivedAt: true, deletedAt: true,
        _count: { select: { files: true } },
      },
    })
  }

  async update(id, data) {
    return prisma.project.update({
      where: { id },
      data,
      select: {
        id: true, userId: true, name: true, description: true, status: true,
        revisionId: true, settings: true, updatedAt: true,
      },
    })
  }

  async softDelete(id) {
    return prisma.project.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    })
  }

  async archive(id) {
    return prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      select: { id: true, status: true, archivedAt: true },
    })
  }

  async incrementRevision(id) {
    return prisma.project.update({
      where: { id },
      data: { revisionId: randomUUID() },
      select: { id: true, revisionId: true, updatedAt: true },
    })
  }

  async findByIdAndUser(id, userId) {
    return prisma.project.findUnique({
      where: { id, userId },
      select: {
        id: true, userId: true, name: true, description: true, status: true,
        revisionId: true, settings: true, createdAt: true, updatedAt: true,
      },
    })
  }
}

export const projectRepository = new ProjectRepository()
export default projectRepository
