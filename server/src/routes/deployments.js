// import { Router } from 'express'
// import { deploymentController } from '../controllers/deployment.controller.js'
// import { protect } from '../middleware/auth.js'
// import { validate } from '../middleware/validation.js'
// // import { projectIdParamSchema } from '../validators/project.validators.js'
// import { z } from 'zod'

// const versionIdParamSchema = z.object({
//   versionId: z.string().cuid('Invalid version ID'),
// })

// const publishBodySchema = z.object({
//   commitMessage: z.string().optional(),
// })

// const router = Router()

// // All deployment routes require authentication

// // Publish a draft project
// router.post(
//   '/deployments/:projectId/publish',
//   protect,
//   validate({ params: projectIdParamSchema, body: publishBodySchema }),
//   deploymentController.publish
// )

// // Republish a project (new snapshot from current draft)
// router.post(
//   '/deployments/:projectId/republish',
//   protect,
//   validate({ params: projectIdParamSchema, body: publishBodySchema }),
//   deploymentController.republish
// )

// // Unpublish a project
// router.post(
//   '/deployments/:projectId/unpublish',
//   protect,
//   validate({ params: projectIdParamSchema }),
//   deploymentController.unpublish
// )

// // Get deployment history
// router.get(
//   '/deployments/:projectId/history',
//   protect,
//   validate({ params: projectIdParamSchema }),
//   deploymentController.getHistory
// )

// // Get current live deployment status
// router.get(
//   '/deployments/:projectId/status',
//   protect,
//   validate({ params: projectIdParamSchema }),
//   deploymentController.getStatus
// )

// // Rollback to a previous version
// router.post(
//   '/deployments/:projectId/rollback/:versionId',
//   protect,
//   validate({ params: { ...projectIdParamSchema.shape, ...versionIdParamSchema.shape } }),
//   deploymentController.rollback
// )

// // List version snapshots for a project
// router.get(
//   '/deployments/:projectId/versions',
//   protect,
//   validate({ params: projectIdParamSchema }),
//   deploymentController.listVersions
// )

// export default router


import { Router } from 'express'
import { deploymentController } from '../controllers/deployment.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { z } from 'zod'

const projectIdParamSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
})

const rollbackParamSchema = projectIdParamSchema.extend({
  versionId: z.string().cuid('Invalid version ID'),
})

const publishBodySchema = z.object({
  commitMessage: z.string().optional(),
})

const router = Router()

// All deployment routes require authentication

// Publish a draft project
router.post(
  '/deployments/:projectId/publish',
  protect,
  validate({ params: projectIdParamSchema, body: publishBodySchema }),
  deploymentController.publish
)

// Republish a project (new snapshot from current draft)
router.post(
  '/deployments/:projectId/republish',
  protect,
  validate({ params: projectIdParamSchema, body: publishBodySchema }),
  deploymentController.republish
)

// Unpublish a project
router.post(
  '/deployments/:projectId/unpublish',
  protect,
  validate({ params: projectIdParamSchema }),
  deploymentController.unpublish
)

// Get deployment history
router.get(
  '/deployments/:projectId/history',
  protect,
  validate({ params: projectIdParamSchema }),
  deploymentController.getHistory
)

// Get current live deployment status
router.get(
  '/deployments/:projectId/status',
  protect,
  validate({ params: projectIdParamSchema }),
  deploymentController.getStatus
)

// Rollback to a previous version
router.post(
  '/deployments/:projectId/rollback/:versionId',
  protect,
  validate({ params: rollbackParamSchema }),
  deploymentController.rollback
)

// List version snapshots for a project
router.get(
  '/deployments/:projectId/versions',
  protect,
  validate({ params: projectIdParamSchema }),
  deploymentController.listVersions
)

export default router
