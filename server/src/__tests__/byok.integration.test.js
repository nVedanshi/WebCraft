import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encryptSecret, decryptSecret } from '../lib/crypto.js'
import { isByokActive, resolveProviderCredentials } from '../services/billing/byok.service.js'

const prisma = new PrismaClient()

let userIdA
let userIdB

describe('BYOK — encryption at rest', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await prisma.user.create({
      data: {
        email: `byok-enc-${Date.now()}@example.com`,
        passwordHash,
        name: 'BYOK Enc User',
        credits: 0,
        purchasedCredits: 0,
        reservedCredits: 0,
        tier: 'FREE',
      },
    })
    userIdA = user.id
  })

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userIdA } }).catch(() => {})
    await prisma.providerConfig.deleteMany({ where: { userId: userIdA } }).catch(() => {})
  })

  it('stores keys encrypted, not in plaintext', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'openai',
        apiKeyEnc: encryptSecret('sk-test-1234567890abcdef'),
        billingMode: 'byok',
      },
    })

    const stored = await prisma.providerConfig.findFirst({
      where: { userId: userIdA, provider: 'openai' },
    })
    expect(stored.apiKeyEnc).not.toBe('sk-test-1234567890abcdef')
    expect(stored.apiKeyEnc).not.toContain('sk-test')
    expect(decryptSecret(stored.apiKeyEnc)).toBe('sk-test-1234567890abcdef')
  })

  it('isByokActive returns true when billingMode is byok', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'openai',
        apiKeyEnc: encryptSecret('sk-test-1234567890abcdef'),
        billingMode: 'byok',
      },
    })

    const active = await isByokActive(userIdA, 'openai')
    expect(active).toBe(true)
  })

  it('isByokActive returns false when billingMode is system', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'openai',
        apiKeyEnc: encryptSecret('sk-test-1234567890abcdef'),
        billingMode: 'system',
      },
    })

    const active = await isByokActive(userIdA, 'openai')
    expect(active).toBe(false)
  })

  it('isByokActive returns false when no config exists', async () => {
    const active = await isByokActive(userIdA, 'openai')
    expect(active).toBe(false)
  })
})

describe('BYOK — key isolation between users', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const userA = await prisma.user.create({
      data: {
        email: `byok-iso-a-${Date.now()}@example.com`,
        passwordHash,
        name: 'User A',
        credits: 0,
        tier: 'FREE',
      },
    })
    userIdA = userA.id
    const userB = await prisma.user.create({
      data: {
        email: `byok-iso-b-${Date.now()}@example.com`,
        passwordHash,
        name: 'User B',
        credits: 0,
        tier: 'FREE',
      },
    })
    userIdB = userB.id
  })

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userIdA } }).catch(() => {})
    await prisma.user.delete({ where: { id: userIdB } }).catch(() => {})
    await prisma.providerConfig.deleteMany({ where: { userId: userIdA } }).catch(() => {})
    await prisma.providerConfig.deleteMany({ where: { userId: userIdB } }).catch(() => {})
  })

  it('user B cannot resolve user A key', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'openai',
        apiKeyEnc: encryptSecret('sk-user-a-secret-key'),
        billingMode: 'byok',
      },
    })

    // User B has no config for openai
    const active = await isByokActive(userIdB, 'openai')
    expect(active).toBe(false)

    // User A can resolve their own key
    const creds = await resolveProviderCredentials(userIdA, 'openai')
    expect(creds.mode).toBe('byok')
    expect(creds.apiKey).toBe('sk-user-a-secret-key')
  })
})

describe('BYOK — revocation', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await prisma.user.create({
      data: {
        email: `byok-revoke-${Date.now()}@example.com`,
        passwordHash,
        name: 'Revoke User',
        credits: 0,
        tier: 'FREE',
      },
    })
    userIdA = user.id
  })

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userIdA } }).catch(() => {})
    await prisma.providerConfig.deleteMany({ where: { userId: userIdA } }).catch(() => {})
  })

  it('after disconnect, isByokActive returns false', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'openai',
        apiKeyEnc: encryptSecret('sk-test-revoke-key'),
        billingMode: 'byok',
      },
    })

    let active = await isByokActive(userIdA, 'openai')
    expect(active).toBe(true)

    // Simulate revocation (disconnect)
    await prisma.providerConfig.deleteMany({
      where: { userId: userIdA, provider: 'openai' },
    })

    active = await isByokActive(userIdA, 'openai')
    expect(active).toBe(false)
  })
})

describe('BYOK — resolveProviderCredentials returns system mode when not configured', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await prisma.user.create({
      data: {
        email: `byok-resolve-${Date.now()}@example.com`,
        passwordHash,
        name: 'Resolve User',
        credits: 0,
        tier: 'FREE',
      },
    })
    userIdA = user.id
  })

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userIdA } }).catch(() => {})
    await prisma.providerConfig.deleteMany({ where: { userId: userIdA } }).catch(() => {})
  })

  it('returns system mode with null apiKey when no BYOK config', async () => {
    const creds = await resolveProviderCredentials(userIdA, 'openai')
    expect(creds.mode).toBe('system')
    expect(creds.apiKey).toBeNull()
  })

  it('returns byok mode with decrypted key when billingMode=byok', async () => {
    await prisma.providerConfig.create({
      data: {
        userId: userIdA,
        provider: 'anthropic',
        apiKeyEnc: encryptSecret('sk-ant-1234567890'),
        billingMode: 'byok',
      },
    })

    const creds = await resolveProviderCredentials(userIdA, 'anthropic')
    expect(creds.mode).toBe('byok')
    expect(creds.apiKey).toBe('sk-ant-1234567890')
  })
})
