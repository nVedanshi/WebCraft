import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/error.js'
import { encryptSecret, decryptSecret } from '../../lib/crypto.js'
import { kvSet, kvGet, kvDel } from '../../lib/redis.js'

/**
 * GitHubService — real GitHub OAuth + repository access + project sync.
 *
 * - OAuth state is CSPRNG-generated, single-use, and TTL-bound (CSRF-safe).
 * - Access tokens are encrypted at rest and never returned to the client.
 * - "Connected" is reported only when a stored token exists.
 * - Project↔Repo linking tracks last-synced commit SHA for conflict detection.
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const API_BASE = 'https://api.github.com'

function isReal(v) {
  if (!v) return false
  const s = String(v).toLowerCase()
  return !s.startsWith('your_') && !s.includes('placeholder') && !s.includes('replace')
}

export class GitHubService {
  get clientId() {
    return process.env.GITHUB_CLIENT_ID || ''
  }
  get clientSecret() {
    return process.env.GITHUB_CLIENT_SECRET || ''
  }
  get redirectUri() {
    return (
      process.env.GITHUB_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 4000}/api/v1/integrations/github/callback`
    )
  }
  isConfigured() {
    return isReal(this.clientId) && isReal(this.clientSecret)
  }
  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new AppError(
        503,
        'GITHUB_NOT_CONFIGURED',
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
      )
    }
  }

  async createAuthorization(userId) {
    this.ensureConfigured()
    const state = crypto.randomBytes(24).toString('hex')
    await kvSet(`github:oauth:${state}`, userId, 600)
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('redirect_uri', this.redirectUri)
    url.searchParams.set('scope', 'repo read:user')
    url.searchParams.set('state', state)
    return url.toString()
  }

  async handleCallback({ code, state }) {
    this.ensureConfigured()
    if (!code || !state) throw new AppError(400, 'INVALID_CALLBACK', 'Missing code or state')
    const userId = await kvGet(`github:oauth:${state}`)
    if (!userId) throw new AppError(400, 'INVALID_STATE', 'OAuth state is invalid or expired')
    await kvDel(`github:oauth:${state}`) // single-use

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.access_token) {
      throw new AppError(502, 'GITHUB_TOKEN_EXCHANGE_FAILED', data.error_description || data.error || 'Token exchange failed')
    }

    const tokenEnc = encryptSecret(data.access_token)
    const existing = await prisma.providerConfig.findFirst({ where: { userId, provider: 'github' } })
    if (existing) {
      await prisma.providerConfig.update({ where: { id: existing.id }, data: { apiKeyEnc: tokenEnc } })
    } else {
      await prisma.providerConfig.create({ data: { userId, provider: 'github', apiKeyEnc: tokenEnc } })
    }
    return { userId }
  }

  async status(userId) {
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider: 'github' } })
    return { configured: this.isConfigured(), connected: Boolean(c) }
  }

  async disconnect(userId) {
    await prisma.providerConfig.deleteMany({ where: { userId, provider: 'github' } })
    return { connected: false }
  }

  async _token(userId) {
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider: 'github' } })
    if (!c) throw new AppError(404, 'GITHUB_NOT_CONNECTED', 'GitHub is not connected')
    return decryptSecret(c.apiKeyEnc)
  }

  // ─────────────────────────────────────────────────────────────────
  // Repository management
  // ─────────────────────────────────────────────────────────────────

  async listRepos(userId) {
    const token = await this._token(userId)
    const res = await fetch(`${API_BASE}/user/repos?per_page=100&sort=updated`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${res.status}`)
    const repos = await res.json()
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch,
      url: r.html_url,
    }))
  }

  async listBranches(userId, owner, repo) {
    const token = await this._token(userId)
    const res = await fetch(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    )
    if (!res.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${res.status}`)
    const branches = await res.json()
    return branches.map((b) => ({ name: b.name, sha: b.commit?.sha }))
  }

  async createRepo(userId, { name, description, private: isPrivate = false }) {
    const token = await this._token(userId)
    const res = await fetch(`${API_BASE}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new AppError(502, 'GITHUB_CREATE_REPO_FAILED', err.message || `GitHub responded ${res.status}`)
    }
    const r = await res.json()
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch,
      url: r.html_url,
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Project ↔ Repo linking
  // ─────────────────────────────────────────────────────────────────

  async getProjectGitHub(userId, projectId) {
    const link = await prisma.gitHubProject.findFirst({
      where: { projectId, userId },
      select: { id: true, projectId: true, owner: true, repo: true, branch: true, lastSyncedCommitSha: true, lastSyncedAt: true, createdAt: true, updatedAt: true },
    })
    return link
  }

  async connectProject(userId, projectId, { owner, repo, branch }) {
    // Verify project ownership
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')

    // Verify repo exists and user has access
    const token = await this._token(userId)
    const repoRes = await fetch(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!repoRes.ok) throw new AppError(404, 'REPO_NOT_FOUND', `Repository ${owner}/${repo} not found or inaccessible`)

    // Verify branch exists
    const branches = await this.listBranches(userId, owner, repo)
    if (!branches.some((b) => b.name === branch)) {
      throw new AppError(400, 'BRANCH_NOT_FOUND', `Branch "${branch}" not found in ${owner}/${repo}`)
    }

    // Upsert the link
    const existing = await prisma.gitHubProject.findFirst({ where: { projectId } })
    if (existing) {
      await prisma.gitHubProject.update({
        where: { id: existing.id },
        data: { userId, owner, repo, branch, updatedAt: new Date() },
      })
    } else {
      await prisma.gitHubProject.create({
        data: { projectId, userId, owner, repo, branch },
      })
    }

    return { projectId, owner, repo, branch }
  }

  async disconnectProject(userId, projectId) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    if (!link) throw new AppError(404, 'PROJECT_NOT_LINKED', 'Project is not linked to a GitHub repository')
    await prisma.gitHubProject.delete({ where: { id: link.id } })
    return { projectId, disconnected: true }
  }

  // ─────────────────────────────────────────────────────────────────
  // GitHub Contents API helpers
  // ─────────────────────────────────────────────────────────────────

  async _getFileContents(userId, owner, repo, path, branch) {
    const token = await this._token(userId)
    const res = await fetch(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    )
    if (res.status === 404) return null
    if (!res.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${res.status}`)
    const data = await res.json()
    if (data.type !== 'file') return null
    const content = Buffer.from(data.content, 'base64').toString('utf8')
    return { path: data.path, content, sha: data.sha, size: data.size, encoding: data.encoding }
  }

  async _createOrUpdateFile(userId, owner, repo, branch, path, content, sha, commitMessage) {
    const token = await this._token(userId)
    const body = {
      message: commitMessage || `Update ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
    }
    if (sha) body.sha = sha
    const res = await fetch(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new AppError(502, 'GITHUB_FILE_WRITE_FAILED', err.message || `GitHub responded ${res.status}`)
    }
    return await res.json()
  }

  async _getBranchHeadSha(userId, owner, repo, branch) {
    const token = await this._token(userId)
    const res = await fetch(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${res.status}`)
    const data = await res.json()
    return data.object.sha
  }

  async _createBranch(userId, owner, repo, branch, fromSha) {
    const token = await this._token(userId)
    const res = await fetch(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      // Branch may already exist
      if (err.message && err.message.includes('Reference already exists')) return
      throw new AppError(502, 'GITHUB_CREATE_BRANCH_FAILED', err.message || `GitHub responded ${res.status}`)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Sync record helpers
  // ─────────────────────────────────────────────────────────────────

  async _createSyncRecord(projectId, userId, type) {
    return prisma.gitHubSyncRecord.create({
      data: { projectId, userId, type, status: 'PENDING' },
    })
  }

  async _updateSyncRecord(id, updates) {
    return prisma.gitHubSyncRecord.update({ where: { id }, data: updates })
  }

  // ─────────────────────────────────────────────────────────────────
  // Publish: push all project files to GitHub
  // ─────────────────────────────────────────────────────────────────

  async publishProject(userId, projectId, { commitMessage } = {}) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    if (!link) throw new AppError(404, 'PROJECT_NOT_LINKED', 'Project is not linked to a GitHub repository')

    const record = await this._createSyncRecord(projectId, userId, 'PUSH')

    try {
      const token = await this._token(userId)
      const { owner, repo, branch } = link

      // Ensure branch exists
      try {
        await this._getBranchHeadSha(userId, owner, repo, branch)
      } catch {
        const head = await this._getBranchHeadSha(userId, owner, repo, link.branch || 'main')
        await this._createBranch(userId, owner, repo, branch, head)
      }

      // Get all project files
      const files = await prisma.projectFile.findMany({ where: { projectId }, select: { path: true, content: true } })

      let filesChanged = 0
      let commitsPushed = 0
      const msg = commitMessage || `Publish ${files.length} files from WebCraft project ${projectId}`

      for (const f of files) {
        try {
          const existing = await this._getFileContents(userId, owner, repo, f.path, branch)
          await this._createOrUpdateFile(userId, owner, repo, branch, f.path, f.content, existing?.sha, msg)
          filesChanged++
          if (existing) commitsPushed++
        } catch (err) {
          // Continue with other files on individual failure
          console.error(`Failed to publish ${f.path}:`, err)
        }
      }

      const headSha = await this._getBranchHeadSha(userId, owner, repo, branch)

      await this._updateSyncRecord(record.id, {
        status: 'COMPLETED',
        filesChanged,
        commitsPushed,
        completedAt: new Date(),
      })
      await prisma.gitHubProject.update({
        where: { id: link.id },
        data: { lastSyncedCommitSha: headSha, lastSyncedAt: new Date(), updatedAt: new Date() },
      })

      return {
        syncId: record.id,
        status: 'COMPLETED',
        filesChanged,
        commitsPushed,
        owner, repo, branch,
      }
    } catch (err) {
      await this._updateSyncRecord(record.id, {
        status: 'FAILED',
        error: err.message || 'Publish failed',
        completedAt: new Date(),
      })
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Pull: fetch changes from GitHub to project
  // ─────────────────────────────────────────────────────────────────

  async pullProject(userId, projectId, { commitMessage } = {}) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    if (!link) throw new AppError(404, 'PROJECT_NOT_LINKED', 'Project is not linked to a GitHub repository')

    const record = await this._createSyncRecord(projectId, userId, 'PULL')

    try {
      const token = await this._token(userId)
      const { owner, repo, branch } = link

      // Get tree of all files in the repo at the branch
      const headSha = await this._getBranchHeadSha(userId, owner, repo, branch)
      const treeRes = await fetch(
        `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(headSha)}?recursive=1`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      )
      if (!treeRes.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${treeRes.status}`)
      const tree = await treeRes.json()

      const fileEntries = tree.tree.filter((t) => t.type === 'blob')

      let filesChanged = 0
      for (const entry of fileEntries) {
        const remote = await this._getFileContents(userId, owner, repo, entry.path, branch)
        if (!remote) continue
        try {
          await prisma.projectFile.upsert({
            where: { projectId_path: { projectId, path: remote.path } },
            update: { content: remote.content, size: remote.size, mimeType: remote.encoding === 'base64' ? 'text/plain' : undefined },
            create: { projectId, path: remote.path, content: remote.content, size: remote.size, type: 'file' },
          })
          filesChanged++
        } catch (err) {
          console.error(`Failed to pull ${remote.path}:`, err)
        }
      }

      await this._updateSyncRecord(record.id, {
        status: 'COMPLETED',
        filesChanged,
        completedAt: new Date(),
      })
      await prisma.gitHubProject.update({
        where: { id: link.id },
        data: { lastSyncedCommitSha: headSha, lastSyncedAt: new Date(), updatedAt: new Date() },
      })

      return {
        syncId: record.id,
        status: 'COMPLETED',
        filesChanged,
        owner, repo, branch,
      }
    } catch (err) {
      await this._updateSyncRecord(record.id, {
        status: 'FAILED',
        error: err.message || 'Pull failed',
        completedAt: new Date(),
      })
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Sync: two-way sync with conflict detection
  // ─────────────────────────────────────────────────────────────────

  async syncProject(userId, projectId, { commitMessage } = {}) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    if (!link) throw new AppError(404, 'PROJECT_NOT_LINKED', 'Project is not linked to a GitHub repository')

    const record = await this._createSyncRecord(projectId, userId, 'SYNC')

    try {
      const token = await this._token(userId)
      const { owner, repo, branch } = link
      const msg = commitMessage || `Sync ${projectId} with GitHub`

      // Get remote head SHA
      const remoteHeadSha = await this._getBranchHeadSha(userId, owner, repo, branch)
      const lastSyncedSha = link.lastSyncedCommitSha

      // Get tree of all files in the repo
      const treeRes = await fetch(
        `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(remoteHeadSha)}?recursive=1`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      )
      if (!treeRes.ok) throw new AppError(502, 'GITHUB_API_ERROR', `GitHub responded ${treeRes.status}`)
      const tree = await treeRes.json()

      // Get all local files
      const localFiles = await prisma.projectFile.findMany({ where: { projectId }, select: { path: true, content: true } })
      const localMap = {}
      for (const f of localFiles) localMap[f.path] = f.content

      const conflicts = []
      let filesChanged = 0

      for (const entry of tree.tree) {
        if (entry.type !== 'blob') continue
        const remote = await this._getFileContents(userId, owner, repo, entry.path, branch)
        if (!remote) continue

        const localContent = localMap[remote.path]
        const hasLocal = localContent !== undefined

        if (hasLocal && localContent !== remote.content) {
          // Conflict: both sides have different content
          if (lastSyncedSha && remoteHeadSha !== lastSyncedSha) {
            // Need base content for 3-way merge
            const baseContent = await this._getFileAtCommit(userId, owner, repo, remote.path, lastSyncedSha)
            conflicts.push({
              path: remote.path,
              ours: localContent,
              theirs: remote.content,
              base: baseContent || '',
              resolution: null,
            })
            continue
          }
          // No last-synced reference — treat remote as source of truth (pull wins)
          // But record it as a potential conflict
          conflicts.push({
            path: remote.path,
            ours: localContent,
            theirs: remote.content,
            base: null,
            resolution: 'theirs',
          })
        }
      }

      if (conflicts.length > 0 && conflicts.some((c) => c.resolution === null)) {
        // Unresolved conflicts — stop and report
        await this._updateSyncRecord(record.id, {
          status: 'CONFLICT',
          filesChanged,
          conflicts,
          completedAt: new Date(),
        })
        return {
          syncId: record.id,
          status: 'CONFLICT',
          filesChanged,
          conflicts,
          owner, repo, branch,
        }
      }

      // Apply non-conflicting changes (pull wins for resolved/theirs)
      for (const entry of tree.tree) {
        if (entry.type !== 'blob') continue
        const remote = await this._getFileContents(userId, owner, repo, entry.path, branch)
        if (!remote) continue

        const conflict = conflicts.find((c) => c.path === remote.path)
        if (conflict && conflict.resolution === null) continue // skip unresolved

        try {
          await prisma.projectFile.upsert({
            where: { projectId_path: { projectId, path: remote.path } },
            update: { content: remote.content, size: remote.size },
            create: { projectId, path: remote.path, content: remote.content, size: remote.size, type: 'file' },
          })
          filesChanged++
        } catch (err) {
          console.error(`Failed to sync ${remote.path}:`, err)
        }
      }

      // Push local-only files to GitHub
      for (const [path, content] of Object.entries(localMap)) {
        if (!tree.tree.some((t) => t.path === path && t.type === 'blob')) {
          try {
            await this._createOrUpdateFile(userId, owner, repo, branch, path, content, undefined, msg)
            filesChanged++
          } catch (err) {
            console.error(`Failed to push ${path}:`, err)
          }
        }
      }

      // Update last synced commit SHA
      await this._updateSyncRecord(record.id, {
        status: 'COMPLETED',
        filesChanged,
        conflicts,
        completedAt: new Date(),
      })
      await prisma.gitHubProject.update({
        where: { id: link.id },
        data: { lastSyncedCommitSha: remoteHeadSha, lastSyncedAt: new Date(), updatedAt: new Date() },
      })

      return {
        syncId: record.id,
        status: 'COMPLETED',
        filesChanged,
        conflicts,
        owner, repo, branch,
      }
    } catch (err) {
      await this._updateSyncRecord(record.id, {
        status: 'FAILED',
        error: err.message || 'Sync failed',
        completedAt: new Date(),
      })
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Get file content at a specific commit (for 3-way merge base)
  // ─────────────────────────────────────────────────────────────────

  async _getFileAtCommit(userId, owner, repo, path, commitSha) {
    const token = await this._token(userId)
    const res = await fetch(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(commitSha)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    )
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = await res.json()
    if (data.type !== 'file') return null
    return Buffer.from(data.content, 'base64').toString('utf8')
  }

  // ─────────────────────────────────────────────────────────────────
  // Resolve a conflict: accept local or remote version
  // ─────────────────────────────────────────────────────────────────

  async resolveConflict(userId, projectId, { path, resolution, commitMessage }) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    if (!link) throw new AppError(404, 'PROJECT_NOT_LINKED', 'Project is not linked to a GitHub repository')

    if (resolution !== 'ours' && resolution !== 'theirs') {
      throw new AppError(400, 'INVALID_RESOLUTION', 'Resolution must be "ours" or "theirs"')
    }

    // Find the most recent conflict record
    const record = await prisma.gitHubSyncRecord.findFirst({
      where: { projectId, status: 'CONFLICT' },
      orderBy: { createdAt: 'desc' },
    })
    if (!record) throw new AppError(404, 'CONFLICT_NOT_FOUND', 'No unresolved conflict found')

    const conflict = record.conflicts.find((c) => c.path === path)
    if (!conflict) throw new AppError(404, 'CONFLICT_PATH_NOT_FOUND', `No conflict for path ${path}`)

    // Update the conflict resolution
    conflict.resolution = resolution
    const allResolved = record.conflicts.every((c) => c.resolution !== null)

    await prisma.gitHubSyncRecord.update({
      where: { id: record.id },
      data: { conflicts: record.conflicts },
    })

    if (!allResolved) {
      return { recordId: record.id, resolved: false, remaining: record.conflicts.filter((c) => c.resolution === null).length }
    }

    // All resolved — apply resolutions
    const token = await this._token(userId)
    const { owner, repo, branch } = link
    const msg = commitMessage || `Resolve conflicts in ${projectId}`

    for (const c of record.conflicts) {
      const content = c.resolution === 'ours' ? c.ours : c.theirs
      try {
        const existing = await this._getFileContents(userId, owner, repo, c.path, branch)
        await this._createOrUpdateFile(userId, owner, repo, branch, c.path, content, existing?.sha, msg)
        // Also update local project file
        await prisma.projectFile.upsert({
          where: { projectId_path: { projectId, path: c.path } },
          update: { content },
          create: { projectId, path: c.path, content, size: content.length, type: 'file' },
        })
      } catch (err) {
        console.error(`Failed to resolve ${c.path}:`, err)
      }
    }

    const headSha = await this._getBranchHeadSha(userId, owner, repo, branch)
    await this._updateSyncRecord(record.id, {
      status: 'COMPLETED',
      resolvedAt: new Date(),
      completedAt: new Date(),
    })
    await prisma.gitHubProject.update({
      where: { id: link.id },
      data: { lastSyncedCommitSha: headSha, lastSyncedAt: new Date(), updatedAt: new Date() },
    })

    return { recordId: record.id, resolved: true, remaining: 0 }
  }

  // ─────────────────────────────────────────────────────────────────
  // Sync status / history
  // ─────────────────────────────────────────────────────────────────

  async getSyncStatus(userId, projectId) {
    const link = await prisma.gitHubProject.findFirst({ where: { projectId, userId } })
    const records = await prisma.gitHubSyncRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return { link, records }
  }
}

export const githubService = new GitHubService()
export default GitHubService