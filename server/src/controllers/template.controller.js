import { templateService } from '../services/template.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

export const templateController = {
  list: catchAsync(async (req, res) => {
    const { category, search, sort, order, take, cursor } = req.validatedQuery || req.query
    const result = await templateService.listTemplates({ category, search, sort, order, take, cursor })
    res.json({ success: true, data: result })
  }),

  get: catchAsync(async (req, res) => {
    const { templateId } = req.validatedParams || req.params
    const template = await templateService.getTemplate(templateId)
    res.json({ success: true, data: { template } })
  }),

  categories: catchAsync(async (_req, res) => {
    const categories = await templateService.listCategories()
    res.json({ success: true, data: { categories } })
  }),

  use: catchAsync(async (req, res) => {
    const { templateId } = req.validatedParams || req.params
    const { name, description } = req.validatedBody || req.body
    const project = await templateService.useTemplate(req.user.id, templateId, {
      name,
      description,
    })
    res.status(201).json({
      success: true,
      data: { project },
      message: 'Project created from template',
    })
  }),
}

export default templateController
