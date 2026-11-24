import Redis from 'ioredis'

/**
 * Redis client singleton.
 *
 * Used for:
 *   - Refresh-token storage (revocation + TTL)
 *   - BullMQ-backed generation jobs (Phase 2)
 *   - Caching (future)
 *
 * A single shared connection is created per process. ioredis reconnects
 * automatically; if Redis is unavailable the client emits errors but the app
 * can still boot so Redis is treated as optional where practical.
 */
let redis = null

// In-memory fallback for refresh tokens when Redis is unavailable (local dev
// only). Production must run Redis; this fallback is process-scoped and does
// not survive restarts or scale to multiple servers.
const memoryStore = new Map()

export function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    redis.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[REDIS]', err.message)
    })
  }
  return redis
}

export async function refreshGet(userId) {
  const key = `webcraft:refresh:${userId}`
  try {
    const client = getRedis()
    await client.connect()
    return await client.get(key)
  } catch {
    return memoryStore.get(key) ?? null
  }
}

export async function refreshSet(userId, hash, ttlSeconds) {
  const key = `webcraft:refresh:${userId}`
  try {
    const client = getRedis()
    await client.connect()
    await client.set(key, hash, 'EX', ttlSeconds)
    return
  } catch {
    memoryStore.set(key, hash)
    return
  }
}

export async function refreshDel(userId) {
  const key = `webcraft:refresh:${userId}`
  try {
    const client = getRedis()
    await client.connect()
    await client.del(key)
  } catch {
    memoryStore.delete(key)
  }
  return
}

export async function kvSet(key, value, ttlSeconds) {
  try {
    const client = getRedis()
    await client.connect()
    if (ttlSeconds) await client.set(key, value, 'EX', ttlSeconds)
    else await client.set(key, value)
  } catch {
    memoryStore.set(key, value)
  }
}

export async function kvGet(key) {
  try {
    const client = getRedis()
    await client.connect()
    return await client.get(key)
  } catch {
    return memoryStore.get(key) ?? null
  }
}

export async function kvDel(key) {
  try {
    const client = getRedis()
    await client.connect()
    await client.del(key)
  } catch {
    memoryStore.delete(key)
  }
}

export async function connectRedis() {
  const client = getRedis()
  await client.connect()
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

export default {
  getRedis,
  refreshGet,
  refreshSet,
  refreshDel,
  kvGet,
  kvSet,
  kvDel,
  connectRedis,
  disconnectRedis,
}
