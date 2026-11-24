import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/redis.js', () => {
  const store = new Map()
  return {
    kvSet: vi.fn(async (key, val, ttl) => { store.set(key, { val, ttl }) }),
    kvGet: vi.fn(async (key) => {
      const entry = store.get(key)
      return entry ? entry.val : null
    }),
    kvDel: vi.fn(async (key) => { store.delete(key) }),
  }
})

vi.mock('../lib/prisma.js', () => {
  const prisma = {
    providerConfig: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
    project: { findFirst: vi.fn(), findUnique: vi.fn() },
    gitHubProject: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    gitHubSyncRecord: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    projectFile: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => fn(prisma)),
  }
  return { prisma }
})

vi.mock('../lib/crypto.js', () => ({
  encryptSecret: vi.fn((v) => `enc:${v}`),
  decryptSecret: vi.fn((v) => (v && v.startsWith('enc:')) ? v.slice(4) : v),
}))

globalThis.fetch = vi.fn()

import { kvSet, kvGet, kvDel } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { GitHubService } from '../services/integrations/github.service.js'

function resetMocks() {
  kvSet.mock.calls.length = 0
  kvGet.mock.calls.length = 0
  kvDel.mock.calls.length = 0
  globalThis.fetch.mock.calls.length = 0
  Object.values(prisma.providerConfig).forEach(m => { if (m && typeof m === 'object' && m.mock) m.mock.calls.length = 0 })
  Object.values(prisma.project).forEach(m => { if (m && typeof m === 'object' && m.mock) m.mock.calls.length = 0 })
  Object.values(prisma.gitHubProject).forEach(m => { if (m && typeof m === 'object' && m.mock) m.mock.calls.length = 0 })
  Object.values(prisma.gitHubSyncRecord).forEach(m => { if (m && typeof m === 'object' && m.mock) m.mock.calls.length = 0 })
  Object.values(prisma.projectFile).forEach(m => { if (m && typeof m === 'object' && m.mock) m.mock.calls.length = 0 })
}

describe('GitHubService — OAuth', () => {
  beforeEach(() => {
    resetMocks()
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
  })

  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
  })

  it('isConfigured returns true when credentials are set', () => {
    const svc = new GitHubService()
    expect(svc.isConfigured()).toBe(true)
  })

  it('isConfigured returns false when credentials are missing', () => {
    delete process.env.GITHUB_CLIENT_ID
    const svc = new GitHubService()
    expect(svc.isConfigured()).toBe(false)
  })

  it('createAuthorization generates state and returns URL', async () => {
    const svc = new GitHubService()
    const url = await svc.createAuthorization('user_123')
    expect(url).toContain('github.com/login/oauth/authorize')
    expect(url).toContain('client_id=test_client_id')
    expect(url).toContain('scope=repo')
    expect(url).toContain('state=')
    const state = url.match(/state=([a-f0-9]+)/)[1]
    expect(kvSet).toHaveBeenCalledWith(`github:oauth:${state}`, 'user_123', 600)
  })

  it('createAuthorization throws 503 when not configured', async () => {
    delete process.env.GITHUB_CLIENT_ID
    const svc = new GitHubService()
    await expect(svc.createAuthorization('user_123')).rejects.toMatchObject({ code: 'GITHUB_NOT_CONFIGURED' })
  })

  it('handleCallback rejects invalid state', async () => {
    kvGet.mockResolvedValueOnce(null)
    const svc = new GitHubService()
    await expect(
      svc.handleCallback({ code: 'abc', state: 'invalid_state' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE' })
  })

  it('handleCallback exchanges code for token and stores encrypted', async () => {
    kvGet.mockResolvedValueOnce('user_123')

    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ghp_abc123def456' }),
    })
    prisma.providerConfig.findFirst.mockResolvedValueOnce(null)
    prisma.providerConfig.create.mockResolvedValueOnce({ id: 'pc_1' })

    const svc = new GitHubService()
    const result = await svc.handleCallback({ code: 'auth_code', state: 'valid_state' })
    expect(result.userId).toBe('user_123')
    expect(kvDel).toHaveBeenCalledWith('github:oauth:valid_state')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('auth_code'),
      })
    )
    expect(prisma.providerConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_123',
          provider: 'github',
          apiKeyEnc: 'enc:ghp_abc123def456',
        }),
      })
    )
  })

  it('status returns connected when token exists', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ id: 'pc_1' })
    const svc = new GitHubService()
    const status = await svc.status('user_123')
    expect(status.connected).toBe(true)
    expect(status.configured).toBe(true)
  })

  it('status returns not connected when no token', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce(null)
    const svc = new GitHubService()
    const status = await svc.status('user_123')
    expect(status.connected).toBe(false)
  })

  it('disconnect removes token', async () => {
    prisma.gitHubProject.findFirst.mockResolvedValueOnce(null)
    prisma.providerConfig.deleteMany.mockResolvedValueOnce({ count: 1 })
    const svc = new GitHubService()
    const result = await svc.disconnect('user_123')
    expect(result.connected).toBe(false)
    expect(prisma.providerConfig.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_123', provider: 'github' },
    })
  })
})

describe('GitHubService — Token protection', () => {
  beforeEach(() => {
    resetMocks()
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
  })

  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
  })

  it('_token throws 404 when not connected', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce(null)
    const svc = new GitHubService()
    await expect(svc._token('user_123')).rejects.toMatchObject({ code: 'GITHUB_NOT_CONNECTED' })
  })

  it('_token returns decrypted token when connected', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ apiKeyEnc: 'enc:my_secret_token' })
    const svc = new GitHubService()
    const token = await svc._token('user_123')
    expect(token).toBe('my_secret_token')
  })
})

describe('GitHubService — Repository operations', () => {
  beforeEach(() => {
    resetMocks()
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
  })

  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
  })

  it('listRepos returns mapped repos', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ apiKeyEnc: 'enc:token123' })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: 'repo-a', full_name: 'user/repo-a', private: false, default_branch: 'main', html_url: 'https://github.com/user/repo-a' },
      ],
    })

    const svc = new GitHubService()
    const repos = await svc.listRepos('user_123')
    expect(repos).toHaveLength(1)
    expect(repos[0]).toMatchObject({ id: 1, name: 'repo-a', fullName: 'user/repo-a', private: false, defaultBranch: 'main' })
  })

  it('createRepo creates a repository', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ apiKeyEnc: 'enc:token123' })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 10, name: 'new-repo', full_name: 'user/new-repo', private: false,
        default_branch: 'main', html_url: 'https://github.com/user/new-repo',
      }),
    })

    const svc = new GitHubService()
    const result = await svc.createRepo('user_123', { name: 'new-repo', description: 'Test repo', private: false })
    expect(result.name).toBe('new-repo')
    expect(result.fullName).toBe('user/new-repo')
  })

  it('listBranches returns branches', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ apiKeyEnc: 'enc:token123' })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'main', commit: { sha: 'abc123' } },
      ],
    })

    const svc = new GitHubService()
    const branches = await svc.listBranches('user_123', 'user', 'repo')
    expect(branches).toHaveLength(1)
    expect(branches[0]).toMatchObject({ name: 'main', sha: 'abc123' })
  })

  it('listRepos throws 404 when not connected', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce(null)
    const svc = new GitHubService()
    await expect(svc.listRepos('user_123')).rejects.toMatchObject({ code: 'GITHUB_NOT_CONNECTED' })
  })
})

describe('GitHubService — Project linking', () => {
  beforeEach(() => {
    resetMocks()
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
  })

  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
  })

  it('connectProject validates project ownership and repo access', async () => {
    prisma.providerConfig.findFirst.mockImplementation(() => Promise.resolve({ apiKeyEnc: 'enc:token123' }))
    prisma.project.findFirst.mockResolvedValueOnce({ id: 'proj_1', userId: 'user_123', name: 'Test' })
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'repo', full_name: 'user/repo', default_branch: 'main' }),
    })
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ name: 'main', commit: { sha: 'abc123' } }],
    })
    prisma.gitHubProject.findFirst.mockResolvedValueOnce(null)
    prisma.gitHubProject.create.mockResolvedValueOnce({ id: 'ghp_1' })

    const svc = new GitHubService()
    const result = await svc.connectProject('user_123', 'proj_1', { owner: 'user', repo: 'repo', branch: 'main' })
    expect(result.projectId).toBe('proj_1')
    expect(result.owner).toBe('user')
    expect(result.repo).toBe('repo')
    expect(result.branch).toBe('main')
    expect(prisma.gitHubProject.create).toHaveBeenCalledWith({
      data: { projectId: 'proj_1', userId: 'user_123', owner: 'user', repo: 'repo', branch: 'main' },
    })
  })

  it('connectProject throws 404 when project not found', async () => {
    prisma.project.findFirst.mockResolvedValueOnce(null)
    const svc = new GitHubService()
    await expect(
      svc.connectProject('user_123', 'proj_1', { owner: 'user', repo: 'repo', branch: 'main' })
    ).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' })
  })

  it('connectProject throws 404 when repo not found', async () => {
    prisma.providerConfig.findFirst.mockResolvedValueOnce({ apiKeyEnc: 'enc:token123' })
    prisma.project.findFirst.mockResolvedValueOnce({ id: 'proj_1', userId: 'user_123', name: 'Test' })
    globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 404 })

    const svc = new GitHubService()
    await expect(
      svc.connectProject('user_123', 'proj_1', { owner: 'user', repo: 'nonexistent', branch: 'main' })
    ).rejects.toMatchObject({ code: 'REPO_NOT_FOUND' })
  })

  it('disconnectProject removes the link', async () => {
    prisma.gitHubProject.findFirst.mockImplementation(() => Promise.resolve({ id: 'ghp_1', projectId: 'proj_1' }))
    prisma.gitHubProject.delete.mockResolvedValueOnce({})
    const svc = new GitHubService()
    const result = await svc.disconnectProject('user_123', 'proj_1')
    expect(result.disconnected).toBe(true)
    expect(prisma.gitHubProject.delete).toHaveBeenCalledWith({ where: { id: 'ghp_1' } })
  })

  it('getProjectGitHub returns link info', async () => {
    prisma.gitHubProject.findFirst.mockImplementation(() => Promise.resolve({
      id: 'ghp_1', projectId: 'proj_1', owner: 'user', repo: 'repo', branch: 'main',
      lastSyncedCommitSha: 'abc123', lastSyncedAt: new Date(),
    }))
    const svc = new GitHubService()
    const link = await svc.getProjectGitHub('user_123', 'proj_1')
    expect(link.owner).toBe('user')
    expect(link.repo).toBe('repo')
    expect(link.branch).toBe('main')
  })
})

describe('GitHubService — Sync conflict detection', () => {
  beforeEach(() => {
    resetMocks()
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
  })

  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
  })

  it('syncProject detects conflicts when both sides modified same file', async () => {
    prisma.providerConfig.findFirst.mockImplementation(() => Promise.resolve({ apiKeyEnc: 'enc:token123' }))
    prisma.gitHubProject.findFirst.mockImplementation(() => Promise.resolve({
      id: 'ghp_1', projectId: 'proj_1', userId: 'user_123',
      owner: 'user', repo: 'repo', branch: 'main',
      lastSyncedCommitSha: 'base_sha',
    }))

    let contentCall = 0
    globalThis.fetch.mockImplementation((url) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return { ok: true, json: async () => ({ tree: [{ type: 'blob', path: 'src/App.jsx', sha: 'remote_sha' }, { type: 'blob', path: 'package.json', sha: 'pkg_sha' }] }) }
      }
      if (u.includes('/contents/')) {
        contentCall++
        const path = u.split('/contents/')[1].split('?')[0]
        if (path === 'src/App.jsx' && contentCall === 1) {
          return { ok: true, json: async () => ({ type: 'blob', content: Buffer.from('base content').toString('base64') }) }
        }
        if (path === 'src/App.jsx') {
          return { ok: true, json: async () => ({ type: 'blob', content: Buffer.from('remote content').toString('base64') }) }
        }
        if (path === 'package.json') {
          return { ok: true, json: async () => ({ type: 'blob', content: Buffer.from('{}').toString('base64') }) }
        }
        return { ok: false, status: 404 }
      }
      if (u.includes('/git/ref/heads/')) {
        return { ok: true, json: async () => ({ object: { sha: 'remote_head_sha' } }) }
      }
      return { ok: false, status: 404 }
    })

    prisma.projectFile.findMany.mockResolvedValueOnce([
      { path: 'src/App.jsx', content: 'local content' },
      { path: 'package.json', content: '{}' },
    ])

    const svc = new GitHubService()
    const result = await svc.syncProject('user_123', 'proj_1')
    expect(result.status).toBe('CONFLICT')
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].path).toBe('src/App.jsx')
    expect(result.conflicts[0].ours).toBe('local content')
    expect(result.conflicts[0].theirs).toBe('remote content')
    expect(result.conflicts[0].base).toBe('base content')
  })

  it('resolveConflict accepts ours', async () => {
    prisma.gitHubProject.findFirst.mockImplementation(() => Promise.resolve({
      id: 'ghp_1', projectId: 'proj_1', userId: 'user_123', owner: 'user', repo: 'repo', branch: 'main',
    }))
    prisma.gitHubSyncRecord.findFirst.mockResolvedValueOnce({
      id: 'sync_1', projectId: 'proj_1', status: 'CONFLICT',
      conflicts: [{ path: 'src/App.jsx', ours: 'local', theirs: 'remote', base: 'base', resolution: null }],
    })
    prisma.gitHubSyncRecord.update.mockResolvedValueOnce({})
    prisma.providerConfig.findFirst.mockImplementation(() => Promise.resolve({ apiKeyEnc: 'enc:token123' }))
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ object: { sha: 'new_head_sha' } }),
    })
    prisma.gitHubProject.update.mockResolvedValueOnce({})

    const svc = new GitHubService()
    const result = await svc.resolveConflict('user_123', 'proj_1', { path: 'src/App.jsx', resolution: 'ours' })
    expect(result.resolved).toBe(true)
    expect(prisma.gitHubSyncRecord.update).toHaveBeenCalledWith({
      where: { id: 'sync_1' },
      data: { status: 'COMPLETED', resolvedAt: expect.any(Date), completedAt: expect.any(Date) },
    })
  })
})