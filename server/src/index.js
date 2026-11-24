import { createApp } from './app.js'
import { config } from './config/index.js'
import { getGenerationWorker, shutdownWorker } from './jobs/generation.job.js'

// dotenv is loaded by config/index.js before env values are read

const app = createApp()

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `WebCraft server running in ${config.nodeEnv} mode on http://localhost:${config.port}`
  )
})

// Start the generation worker. Without it, queued jobs are never processed.
// Requires Redis (REDIS_URL) to be running.
try {
  getGenerationWorker()
  // eslint-disable-next-line no-console
  console.log('[BULLMQ] Generation worker started')
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[BULLMQ] Failed to start generation worker:', err.message)
}

// Graceful shutdown
process.on('SIGTERM', () => {
  shutdownWorker().catch(() => {})
  // eslint-disable-next-line no-console
  console.log('SIGTERM received. Shutting down gracefully...')
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Process terminated')
  })
})

export default app