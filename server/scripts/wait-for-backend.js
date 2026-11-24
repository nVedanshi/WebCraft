import http from 'node:http'

const HOST = '127.0.0.1'
const PORT = process.env.PORT || 4000
const PATH = '/api/v1/health'
const MAX_ATTEMPTS = 60
const INTERVAL_MS = 500

let attempts = 0

function check() {
  const req = http.request(
    { host: HOST, port: PORT, path: PATH, method: 'GET', timeout: 1000 },
    (res) => {
      if (res.statusCode === 200) {
        process.exit(0)
      } else {
        retry()
      }
    }
  )
  req.on('error', () => retry())
  req.on('timeout', () => {
    req.destroy()
    retry()
  })
  req.end()
}

function retry() {
  attempts += 1
  if (attempts >= MAX_ATTEMPTS) {
    console.error(
      `[wait-for-backend] Backend not reachable at http://${HOST}:${PORT}${PATH} after ${MAX_ATTEMPTS} attempts`
    )
    process.exit(1)
  }
  setTimeout(check, INTERVAL_MS)
}

check()
