import { Router } from 'express'

const router = Router()

/**
 * Health endpoint for the versioned API.
 * Used by monitoring and frontend readiness checks.
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'webcraft-server',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
  })
})

export default router
