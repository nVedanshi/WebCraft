import { createApp } from './app.js'
import { config } from './config/index.js'

// dotenv is loaded by config/index.js before env values are read

const app = createApp()

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `WebCraft server running in ${config.nodeEnv} mode on http://localhost:${config.port}`
  )
})

// Graceful shutdown
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received. Shutting down gracefully...')
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Process terminated')
  })
})

export default app
