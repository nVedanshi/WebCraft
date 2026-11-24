import { z } from 'zod'

export const generateProjectSchema = z
  .object({
    prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(4000),
    // When projectId is given, generation fills that existing project
    // (created by the "Create project" step) instead of creating a new one.
    projectId: z.string().cuid('Invalid project ID').optional(),
    projectName: z.string().min(1, 'Project name is required').max(100).optional(),
  })
  .refine((d) => d.projectId || d.projectName, {
    message: 'Project name is required',
    path: ['projectName'],
  })

export const modifyProjectSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  instruction: z.string().min(10, 'Instruction must be at least 10 characters').max(4000),
  expectedRevisionId: z.string().optional(),
})

export const generationJobIdParamSchema = z.object({
  jobId: z.string().cuid('Invalid job ID'),
})

export default {
  generateProjectSchema,
  modifyProjectSchema,
  generationJobIdParamSchema,
}