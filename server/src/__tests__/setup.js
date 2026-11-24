/**
 * Test setup: point Prisma at the test database before any module imports
 * that read DATABASE_URL. Runs migrations against the test DB so tests are
 * isolated from development data.
 */
import { execSync } from 'child_process'

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/webcraft_test?schema=public'
process.env.JWT_ACCESS_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!!'
process.env.NODE_ENV = 'test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.RATE_LIMIT_MAX_REQUESTS = '10000'

// Apply migrations to the test database
try {
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env },
  })
} catch (e) {
  // Migrations may already be applied; ignore if so
}
