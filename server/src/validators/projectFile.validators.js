import { z } from 'zod'
import { validateFilePath } from '../repositories/projectFile.repository.js'

export const projectIdParamSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
})

// Captures the file path after /:projectId/files/ via Express splat (*)
// Express stores it in req.params[0] (numeric key).
export const filePathParamSchema = z.object({
  0: z
    .string()
    .refine((p) => {
      try {
        validateFilePath(p)
        return true
      } catch {
        return false
      }
    }, 'Invalid file path'),
})

export const createFileSchema = z.object({
  path: z.string().refine((p) => {
    try {
      validateFilePath(p)
      return true
    } catch {
      return false
    }
  }, 'Invalid file path'),
  content: z.string().optional(),
  type: z.enum(['file', 'directory']).default('file'),
  expectedRevisionId: z.string().optional(),
})

export const updateFileSchema = z.object({
  content: z.string(),
  expectedRevisionId: z.string().optional(),
})

export const deleteFileQuerySchema = z.object({
  expectedRevisionId: z.string().optional(),
})

export const renameFileSchema = z.object({
  newPath: z.string().refine((p) => {
    try {
      validateFilePath(p)
      return true
    } catch {
      return false
    }
  }, 'Invalid new file path'),
  expectedRevisionId: z.string().optional(),
})

export const moveFileSchema = z.object({
  newPath: z.string().refine((p) => {
    try {
      validateFilePath(p)
      return true
    } catch {
      return false
    }
  }, 'Invalid new file path'),
  expectedRevisionId: z.string().optional(),
})

export default {
  projectIdParamSchema,
  filePathParamSchema,
  createFileSchema,
  updateFileSchema,
  deleteFileQuerySchema,
  renameFileSchema,
  moveFileSchema,
}
