import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * In development, Node.js --watch restarts the module on every file change.
 * Without a global cache, each restart would create a new PrismaClient and
 * exhaust the PostgreSQL connection pool. We attach the client to the global
 * object so it survives hot reloads.
 *
 * Production serverless/long-running processes: a single module-level instance
 * is shared across requests, which is the recommended pattern for Prisma.
 */
const globalForPrisma = globalThis

const prisma = globalForPrisma.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}

export async function connectDatabase() {
  /**
   * Explicitly connect to verify the database is reachable at startup.
   * Throws if PostgreSQL is unavailable so the operator knows immediately.
   */
  await prisma.$connect()
}

export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export { prisma }

export default prisma
