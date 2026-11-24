import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev proxy to the backend API so the browser doesn't hit CORS in dev
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' && !res.headersSent) {
              // Backend is not running — return a clean 503 instead of
              // logging AggregateError [ECONNREFUSED] to the dev console.
              // The client's existing catch block falls back to mock data.
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    code: 'BACKEND_UNAVAILABLE',
                    message: 'Backend server is not running on http://localhost:4000',
                  },
                }),
              )
            }
          })
        },
      },
    },
  },
})
