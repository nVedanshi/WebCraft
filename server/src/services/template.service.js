import { prisma } from '../lib/prisma.js'
import { projectRepository } from '../repositories/project.repository.js'
import { projectFileRepository } from '../repositories/projectFile.repository.js'
import { AppError } from '../middleware/error.js'
import { randomUUID } from 'crypto'

/**
 * TemplateService — business logic for template catalog and project creation
 * from templates.
 *
 * Templates are platform-owned, read-only starter kits. When a user uses a
 * template we create a new project owned by that user and copy the template's
 * source files into the project as independent ProjectFile records. Later edits
 * to the project never affect the original template.
 */
export class TemplateService {
  async listTemplates({ category, search, sort, order = 'desc', take = 20, cursor }) {
    const where = {
      isPublished: true,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        take: take + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { [sort || 'createdAt']: order },
        select: {
          id: true, name: true, slug: true, description: true, category: true,
          stack: true, previewImage: true, isPublished: true, createdAt: true,
          updatedAt: true,
          _count: { select: { files: true } },
        },
      }),
      prisma.template.count({ where }),
    ])

    const hasMore = templates.length > take
    const items = hasMore ? templates.slice(0, -1) : templates
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null

    return {
      templates: items,
      categories: await this.listCategories(),
      total,
      take,
      cursor,
      hasMore,
      nextCursor,
    }
  }

  async getTemplate(templateId) {
    const template = await this._resolveTemplate(templateId)
    if (!template) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found')
    }
    return template
  }

  async _resolveTemplate(templateId) {
    // Try by ID first (cuid), then fall back to slug lookup.
    let template = await prisma.template.findUnique({
      where: { id: templateId, isPublished: true },
      select: {
        id: true, name: true, slug: true, description: true, category: true,
        stack: true, previewImage: true, isPublished: true, createdAt: true,
        updatedAt: true,
        files: {
          select: { id: true, path: true, content: true, type: true, size: true },
          orderBy: { path: 'asc' },
        },
      },
    })
    if (template) return template

    return prisma.template.findUnique({
      where: { slug: templateId, isPublished: true },
      select: {
        id: true, name: true, slug: true, description: true, category: true,
        stack: true, previewImage: true, isPublished: true, createdAt: true,
        updatedAt: true,
        files: {
          select: { id: true, path: true, content: true, type: true, size: true },
          orderBy: { path: 'asc' },
        },
      },
    })
  }

  async listCategories() {
    const rows = await prisma.template.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    })
    return rows.map((r) => r.category).sort()
  }

  async useTemplate(userId, templateId, { name, description }) {
    const template = await this._resolveTemplate(templateId)
    if (!template) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found')
    }

    const files = await prisma.templateFile.findMany({
      where: { templateId: template.id },
      select: { path: true, content: true, type: true, size: true },
      orderBy: { path: 'asc' },
    })
    if (files.length === 0) {
      throw new AppError(404, 'TEMPLATE_EMPTY', 'Template has no source files')
    }

    // Create the project and copy all template files atomically.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          userId,
          name,
          description: description ?? null,
          settings: {
            templateId: template.id,
            templateName: template.name,
            templateCategory: template.category,
            createdFromTemplate: true,
          },
        },
        select: {
          id: true, userId: true, name: true, description: true, status: true,
          revisionId: true, settings: true, createdAt: true, updatedAt: true,
        },
      })

      for (const file of files) {
        await tx.projectFile.create({
          data: {
            projectId: created.id,
            path: file.path,
            content: file.content,
            type: file.type ?? 'file',
            size: file.size,
          },
        })
      }

      return created
    })

    return project
  }
}

export const templateService = new TemplateService()
export default templateService
