/**
 * Generation Schemas — Zod validation for all LLM outputs.
 *
 * Every structured output from an LLM provider is validated against these
 * schemas before being used. LLM output is treated as untrusted input.
 *
 * Schemas cover:
 *   - Requirement analysis (app type, features, constraints)
 *   - Application plan (architecture, pages, tech stack)
 *   - File manifest (file paths, contents, operations)
 *   - File operations (create, modify, delete, rename, move)
 *   - Generation responses
 */

import { z } from 'zod'

/**
 * Application type enumeration.
 */
export const AppTypeSchema = z.enum([
  'portfolio',
  'ecommerce',
  'saas-dashboard',
  'crud-app',
  'blog',
  'landing-page',
  'web-app',
  'other',
])

/**
 * Requirement analysis output from the LLM.
 * Validates the structured analysis of a user's natural-language prompt.
 */
export const AnalysisSchema = z.object({
  appType: AppTypeSchema,
  description: z.string().min(1).max(500),
  features: z.array(z.string().min(1).max(100)).min(1).max(50),
  pages: z.array(z.string().min(1).max(100)).min(1).max(50),
  constraints: z.array(z.string().min(1).max(200)).max(20).optional(),
  techStack: z.object({
    frontend: z.string().min(1),
    backend: z.string().min(1),
    database: z.string().min(1),
  }),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
})

/**
 * Application plan output from the LLM.
 * Validates the high-level architecture and structure of the app to build.
 */
export const PlanSchema = z.object({
  appType: AppTypeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  pages: z.array(
    z.object({
      name: z.string().min(1).max(100),
      path: z.string().min(1).max(100),
      description: z.string().max(200).optional(),
      components: z.array(z.string().min(1).max(100)).optional(),
    })
  ).min(1),
  backendRoutes: z.array(
    z.object({
      path: z.string().min(1),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      description: z.string().max(200).optional(),
    })
  ).optional(),
  databaseTables: z.array(
    z.object({
      name: z.string().min(1).max(100),
      columns: z.array(
        z.object({
          name: z.string().min(1).max(100),
          type: z.string().min(1).max(50),
          nullable: z.boolean().optional(),
        })
      ),
    })
  ).optional(),
  dependencies: z.object({
    frontend: z.array(z.string().min(1)).optional(),
    backend: z.array(z.string().min(1)).optional(),
  }),
  setupInstructions: z.string().optional(),
})

/**
 * A single file entry in the manifest.
 */
export const FileEntrySchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .refine((p) => !p.startsWith('/'), 'Path must be relative')
    .refine((p) => !p.includes('..'), 'Path must not contain traversal'),
  content: z.string(),
  type: z.enum(['file', 'directory']).default('file'),
  operation: z
    .enum(['create', 'modify', 'delete', 'rename', 'move'])
    .default('create'),
  newPath: z.string().optional(),
})

/**
 * File manifest output from the LLM.
 * Validates the complete list of files to create/modify for a project.
 */
export const ManifestSchema = z.object({
  projectName: z.string().min(1).max(100),
  files: z.array(FileEntrySchema).min(1),
  totalFiles: z.number().int().positive(),
  instructions: z.string().optional(),
})

/**
 * File operation request for incremental modifications.
 */
export const FileOperationSchema = z.object({
  operation: z.enum(['create', 'modify', 'delete', 'rename', 'move']),
  path: z.string().min(1),
  content: z.string().optional(),
  newPath: z.string().optional(),
  expectedRevisionId: z.string().optional(),
})

/**
 * Generation result response.
 */
export const GenerationResultSchema = z.object({
  success: z.boolean(),
  projectId: z.string().cuid(),
  filesCreated: z.number().int().nonnegative(),
  filesModified: z.number().int().nonnegative(),
  filesDeleted: z.number().int().nonnegative(),
  stages: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
      message: z.string().optional(),
      data: z.any().optional(),
    })
  ),
  tokenUsage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    estimatedCostCents: z.number().nonnegative(),
  }),
  providerInfo: z
    .object({
      provider: z.string().optional(),
      model: z.string().optional(),
      stages: z.array(
        z.object({
          stage: z.string(),
          provider: z.string().optional(),
          model: z.string().optional(),
        })
      ).optional(),
    })
    .optional(),
})

/**
 * Validate and parse an analysis result. Throws ZodError on invalid input.
 */
export function validateAnalysis(data) {
  return AnalysisSchema.parse(data)
}

/**
 * Validate and parse a plan result. Throws ZodError on invalid input.
 */
export function validatePlan(data) {
  return PlanSchema.parse(data)
}

/**
 * Validate and parse a manifest result. Throws ZodError on invalid input.
 */
export function validateManifest(data) {
  return ManifestSchema.parse(data)
}

/**
 * Validate and parse a file operation. Throws ZodError on invalid input.
 */
export function validateFileOperation(data) {
  return FileOperationSchema.parse(data)
}

/**
 * Validate and parse a generation result. Throws ZodError on invalid input.
 */
export function validateGenerationResult(data) {
  return GenerationResultSchema.parse(data)
}
