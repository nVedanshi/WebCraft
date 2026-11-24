import { z } from 'zod'

export const projectIdParamSchema = z.object({
  projectId: z.string().cuid('Invalid project ID').optional(),
  id: z.string().cuid('Invalid project ID').optional(),
})
.refine((data) => data.projectId || data.id, {
  message: 'Invalid project ID',
  path: ['projectId'],
})

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100, 'Project name must be 1-100 characters'),
  description: z.string().max(500).optional(),
  settings: z.record(z.string(), z.any()).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  expectedRevisionId: z.string().optional(),
})

export const listProjectsSchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
  take: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10))
    .optional(),
  cursor: z.string().cuid().optional(),
})

export default {
  projectIdParamSchema,
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
}
