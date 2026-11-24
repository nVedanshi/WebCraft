import { z } from 'zod'

export const templateIdParamSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
})

export const listTemplatesSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'category', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  take: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10))
    .optional(),
  cursor: z.string().cuid().optional(),
})

export const useTemplateSchema = z.object({
  name: z.string().min(1).max(100, 'Project name must be 1-100 characters'),
  description: z.string().max(500).optional(),
})

export default {
  templateIdParamSchema,
  listTemplatesSchema,
  useTemplateSchema,
}
