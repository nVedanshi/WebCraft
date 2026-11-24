import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, resolve } from 'path'

import { config } from './config/index.js'
import { validateConfig } from './config/index.js'
import { notFound, errorMiddleware } from './middleware/error.js'
import { validate } from './middleware/validation.js'

import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import projectRoutes from './routes/projects.js'
import projectFileRoutes from './routes/projectFiles.js'
import generationRoutes from './routes/generation.js'
import billingRoutes from './routes/billing.js'
import templateRoutes from './routes/templates.js'
import integrationRoutes from './routes/integrations.js'
import previewRoutes from './routes/preview.js'
import deploymentRoutes from './routes/deployments.js'
import { previewCache } from './services/preview/service.js'
import { deploymentBuildCache } from './services/deployment/service.js'

/**
 * Build and configure the Express application.
 *
 * Middleware order matters:
 *   1. Helmet        - secure HTTP headers
 *   2. CORS          - restrict browser cross-origin requests
 *   3. Rate limiting - protect against brute force / abuse
 *   4. Body parsing  - JSON only, limited payload size
 *   5. Routes        - versioned API endpoints
 *   6. 404           - unmatched routes
 *   7. Error handler - centralized (must be last)
 */
export function createApp() {
  validateConfig()

  const app = express()

  // Trust proxy (needed for accurate rate-limiter IP when behind a reverse proxy)
  app.set('trust proxy', 1)

  // Secure headers: CSP, HSTS, X-Content-Type-Options, etc.
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // iframe preview needs relaxed COEP
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", config.corsOrigins?.filter(Boolean) ?? []],
        },
      },
    })
  )

  // CORS restricted to configured origins
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // Rate limiting applied to all API routes
  app.use(
    `/api/${config.apiVersion}`,
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      },
    })
  )

  // Per-endpoint rate limits for sensitive routes (stricter than the global limit)
  const authRateLimit = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: Math.floor(config.rateLimitMaxRequests / 5), // 1/5 of global max
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many auth requests, please try again later' },
    },
  })
  const paymentRateLimit = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: Math.floor(config.rateLimitMaxRequests / 10), // 1/10 of global max
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many payment requests, please try again later' },
    },
  })

  // Path traversal guard: ensure a resolved file path stays inside the base dir
  function safeFilePath(baseDir, requestedPath) {
    const base = resolve(baseDir)
    const target = resolve(base, requestedPath)
    const relative = target.slice(base.length)
    // Must start with / or be the base itself, and must not escape via ..
    return relative.startsWith('/') && !relative.startsWith('/..') ? target : null
  }

  // Razorpay webhook needs the RAW body for signature verification.
  // Mount it before the JSON parser so req.body stays a Buffer for that route.
  app.post(
    `/api/${config.apiVersion}/billing/webhook`,
    express.raw({ type: '*/*', limit: '1mb' })
  )

  // JSON body parser with size limit
  app.use(express.json({ limit: '2mb' }))

  // Health check (unversioned, for load balancers)
  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok', service: 'webcraft-server' })
  })

  // Versioned API routes
  app.use(`/api/${config.apiVersion}`, healthRoutes)
  app.use(`/api/${config.apiVersion}/auth`, authRateLimit, authRoutes)
  app.use(`/api/${config.apiVersion}/users`, userRoutes)
  app.use(`/api/${config.apiVersion}/projects`, projectRoutes)
  app.use(`/api/${config.apiVersion}`, projectFileRoutes)
  app.use(`/api/${config.apiVersion}/generation`, generationRoutes)
  app.use(`/api/${config.apiVersion}/billing`, paymentRateLimit, billingRoutes)
  app.use(`/api/${config.apiVersion}/templates`, templateRoutes)
  app.use(`/api/${config.apiVersion}/integrations`, integrationRoutes)
  app.use(`/api/${config.apiVersion}`, previewRoutes)
  app.use(`/api/${config.apiVersion}`, deploymentRoutes)

  // Serve preview build output for projects.
  // The preview service builds each project in a sandbox temp dir; this
  // middleware serves static files from the cached build directory.
  // Path format: /api/v1/preview/:projectId/:restOfPath
  app.use(`/api/${config.apiVersion}/preview/`, (_req, res) => {
    const match = _req.path.match(new RegExp(`^/api/${config.apiVersion}/preview/([^/]+)(/.*)?$`))
    if (!match) {
      return res.status(404).json({ success: false, error: { code: 'INVALID_PREVIEW_PATH', message: 'Invalid preview path' } })
    }
    const projectId = match[1]
    const requestedPath = match[2] || '/index.html'
    const cached = previewCache.get(projectId)
    if (!cached || !cached.success || !cached.buildDir) {
      return res.status(404).json({
        success: false,
        error: { code: 'PREVIEW_NOT_READY', message: 'Preview is not ready. Build the project first.' },
      })
    }
    const filePath = safeFilePath(cached.buildDir, requestedPath)
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      return res.sendFile(filePath)
    }
    const indexPath = join(cached.buildDir, 'index.html')
    if (existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found in preview' } })
  })

  // Serve deployed build output for projects.
  // Each deployment's build output lives in a sandbox temp dir; this
  // middleware serves static files from the cached build directory.
  // Path format: /api/v1/deploy/:deploymentId/:restOfPath
  app.use(`/api/${config.apiVersion}/deploy/`, (_req, res) => {
    const match = _req.path.match(new RegExp(`^/api/${config.apiVersion}/deploy/([^/]+)(/.*)?$`))
    if (!match) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVALID_DEPLOY_PATH', message: 'Invalid deployment path' },
      })
    }
    const deploymentId = match[1]
    const requestedPath = match[2] || '/index.html'
    const cached = deploymentBuildCache.get(deploymentId)
    if (!cached || !cached.success || !cached.buildDir) {
      return res.status(404).json({
        success: false,
        error: { code: 'DEPLOY_NOT_READY', message: 'Deployment is not ready. Publish the project first.' },
      })
    }
    const filePath = safeFilePath(cached.buildDir, requestedPath)
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      return res.sendFile(filePath)
    }
    const indexPath = join(cached.buildDir, 'index.html')
    if (existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found in deployment' } })
  })

  // 404 for unmatched routes
  app.use(notFound)

  // Centralized error handler (must be last)
  app.use(errorMiddleware)

  return app
}

export default createApp
export { validate }
