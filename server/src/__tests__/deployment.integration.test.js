import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { deploymentAdapter } from '../services/deployment/adapter.js'
import { DeploymentService } from '../services/deployment/service.js'

vi.mock('../services/deployment/adapter.js', () => ({
  deploymentAdapter: {
    buildSnapshot: vi.fn(),
    cleanup: vi.fn(),
  },
}))

function resetMocks() {
  vi.restoreAllMocks()
}

describe('DeploymentService — publish', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    resetMocks()
  })

  it('creates a project version snapshot and deploys successfully', async () => {
    vi.spyOn(prisma.project, 'findUnique').mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      name: 'Test Project',
      status: 'ACTIVE',
      revisionId: 'rev_1',
      files: [
        { path: 'src/App.jsx', content: 'export default App', type: 'file', size: 20 },
        { path: 'package.json', content: '{}', type: 'file', size: 2 },
      ],
    })

    deploymentAdapter.buildSnapshot.mockResolvedValue({
      success: true,
      buildDir: '/tmp/build_123',
      message: 'Build succeeded',
    })

    vi.spyOn(prisma.projectVersion, 'create').mockResolvedValue({
      id: 'ver_1',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      label: 'Publish 2026-11-20T00:00:00.000Z',
      createdBy: 'user_1',
      fileCount: 2,
      totalSize: 22,
      snapshot: {},
    })

    prisma.deployment.create.mockResolvedValue({
      id: 'dep_1',
      projectId: 'proj_1',
      userId: 'user_1',
      versionId: 'ver_1',
      url: 'http://localhost:5173/deploy/dep_1',
      status: 'LIVE',
      fileCount: 2,
      totalSize: 22,
      deployedAt: new Date(),
    })

    prisma.project.update.mockResolvedValue({
      id: 'proj_1',
      isPublished: true,
      publishedAt: new Date(),
      deploymentUrl: 'http://localhost:5173/deploy/dep_1',
    })

    const svc = new DeploymentService()
    const result = await svc.publish('user_1', 'proj_1')

    expect(result.success).toBe(true)
    expect(result.deployment.status).toBe('LIVE')
    expect(result.project.isPublished).toBe(true)
    expect(deploymentAdapter.buildSnapshot).toHaveBeenCalledWith('proj_1', [
      { path: 'src/App.jsx', content: 'export default App' },
      { path: 'package.json', content: '{}' },
    ])
    expect(prisma.projectVersion.create).toHaveBeenCalledWith({
      data: {
        projectId: 'proj_1',
        revisionId: 'rev_1',
        createdBy: 'user_1',
        fileCount: 2,
        totalSize: 22,
        snapshot: expect.objectContaining({
          'src/App.jsx': expect.objectContaining({ content: 'export default App' }),
          'package.json': expect.objectContaining({ content: '{}' }),
        }),
      },
    })
  })

  it('throws 404 when project not found', async () => {
    prisma.project.findUnique.mockResolvedValue(null)
    const svc = new DeploymentService()
    await expect(svc.publish('user_1', 'nonexistent')).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND',
    })
  })

  it('throws 403 when user does not own project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_2',
      status: 'ACTIVE',
      revisionId: 'rev_1',
      files: [],
    })
    const svc = new DeploymentService()
    await expect(svc.publish('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('throws 410 when project is deleted', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'DELETED',
      revisionId: 'rev_1',
      files: [],
    })
    const svc = new DeploymentService()
    await expect(svc.publish('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'PROJECT_DELETED',
    })
  })

  it('throws 400 when project has no files', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'ACTIVE',
      revisionId: 'rev_1',
      files: [],
    })
    const svc = new DeploymentService()
    await expect(svc.publish('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'NO_FILES',
    })
  })

  it('marks deployment as FAILED when build fails', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'ACTIVE',
      revisionId: 'rev_1',
      files: [
        { path: 'src/App.jsx', content: 'export default App', type: 'file', size: 20 },
      ],
    })

    deploymentAdapter.buildSnapshot.mockResolvedValue({
      success: false,
      error: 'Build failed',
      errors: [{ type: 'build_failed', message: 'Syntax error' }],
    })

    prisma.projectVersion.create.mockResolvedValue({
      id: 'ver_1',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      label: 'Publish 2026-11-20T00:00:00.000Z',
      createdBy: 'user_1',
      fileCount: 1,
      totalSize: 20,
      snapshot: {},
    })

    prisma.deployment.create.mockResolvedValue({
      id: 'dep_1',
      projectId: 'proj_1',
      userId: 'user_1',
      versionId: 'ver_1',
      url: 'http://localhost:5173/deploy/dep_1',
      status: 'FAILED',
      error: 'Build failed',
    })

    prisma.project.update.mockResolvedValue({
      id: 'proj_1',
      isPublished: false,
    })

    const svc = new DeploymentService()
    const result = await svc.publish('user_1', 'proj_1')

    expect(result.success).toBe(false)
    expect(result.deployment.status).toBe('FAILED')
    expect(result.project.isPublished).toBe(false)
  })
})

describe('DeploymentService — republish', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    resetMocks()
  })

  it('creates a new snapshot and marks previous deployment as rolled back', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'PUBLISHED',
      revisionId: 'rev_2',
      files: [{ path: 'src/App.jsx', content: 'export default App v2', type: 'file', size: 25 }],
      deployments: [{ id: 'dep_1', status: 'LIVE' }],
    })

    deploymentAdapter.buildSnapshot.mockResolvedValue({
      success: true,
      buildDir: '/tmp/build_456',
    })

    prisma.projectVersion.create.mockResolvedValue({
      id: 'ver_2',
      projectId: 'proj_1',
      revisionId: 'rev_2',
      label: 'Republish 2026-11-20T00:00:00.000Z',
      createdBy: 'user_1',
      fileCount: 1,
      totalSize: 25,
      snapshot: {},
    })

    prisma.deployment.updateMany.mockResolvedValue({ count: 1 })
    prisma.deployment.create.mockResolvedValue({
      id: 'dep_2',
      projectId: 'proj_1',
      userId: 'user_1',
      versionId: 'ver_2',
      url: 'http://localhost:5173/deploy/dep_2',
      status: 'LIVE',
    })

    prisma.project.update.mockResolvedValue({
      id: 'proj_1',
      isPublished: true,
      publishedRevisionId: 'rev_2',
    })

    const svc = new DeploymentService()
    const result = await svc.republish('user_1', 'proj_1')

    expect(result.success).toBe(true)
    expect(result.deployment.status).toBe('LIVE')
    expect(prisma.deployment.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1', status: 'LIVE' },
      data: { status: 'ROLLED_BACK' },
    })
  })
})

describe('DeploymentService — unpublish', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    resetMocks()
  })

  it('clears published flag and marks deployment as rolled back', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'PUBLISHED',
    })

    prisma.deployment.updateMany.mockResolvedValue({ count: 1 })
    prisma.project.update.mockResolvedValue({
      id: 'proj_1',
      isPublished: false,
      publishedAt: null,
      deploymentUrl: null,
    })

    const svc = new DeploymentService()
    const result = await svc.unpublish('user_1', 'proj_1')

    expect(result.project.isPublished).toBe(false)
    expect(prisma.deployment.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1', status: 'LIVE' },
      data: { status: 'ROLLED_BACK' },
    })
  })

  it('throws 404 when project not found', async () => {
    prisma.project.findUnique.mockResolvedValue(null)
    const svc = new DeploymentService()
    await expect(svc.unpublish('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND',
    })
  })

  it('throws 403 when user does not own project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_2',
    })
    const svc = new DeploymentService()
    await expect(svc.unpublish('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('DeploymentService — rollback', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    resetMocks()
  })

  it('rolls back to a previous version', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'PUBLISHED',
      revisionId: 'rev_2',
      deployments: [{ id: 'dep_1', status: 'LIVE' }],
    })

    prisma.projectVersion.findUnique.mockResolvedValue({
      id: 'ver_1',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      fileCount: 1,
      totalSize: 20,
    })

    prisma.deployment.updateMany.mockResolvedValue({ count: 1 })
    prisma.deployment.create.mockResolvedValue({
      id: 'dep_2',
      projectId: 'proj_1',
      userId: 'user_1',
      versionId: 'ver_1',
      url: 'http://localhost:5173/deploy/dep_2',
      status: 'LIVE',
    })

    prisma.project.update.mockResolvedValue({
      id: 'proj_1',
      isPublished: true,
      publishedRevisionId: 'rev_1',
    })

    const svc = new DeploymentService()
    const result = await svc.rollback('user_1', 'proj_1', 'ver_1')

    expect(result).toBeDefined()
    expect(result.deployment.status).toBe('LIVE')
  })

  it('throws 404 when version not found', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      status: 'PUBLISHED',
    })
    prisma.projectVersion.findUnique.mockResolvedValue(null)
    const svc = new DeploymentService()
    await expect(svc.rollback('user_1', 'proj_1', 'nonexistent')).rejects.toMatchObject({
      code: 'VERSION_NOT_FOUND',
    })
  })
})

describe('DeploymentService — history and status', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    resetMocks()
  })

  it('returns deployment history', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
    })
    prisma.deployment.findMany.mockResolvedValue([
      {
        id: 'dep_1',
        projectId: 'proj_1',
        userId: 'user_1',
        status: 'LIVE',
        versionId: 'ver_1',
        createdAt: new Date(),
        version: { id: 'ver_1', label: 'v1', fileCount: 1, totalSize: 20, createdAt: new Date() },
      },
    ])

    const svc = new DeploymentService()
    const result = await svc.getDeploymentHistory('user_1', 'proj_1')

    expect(result.deployments).toHaveLength(1)
    expect(result.deployments[0].status).toBe('LIVE')
  })

  it('returns live deployment status', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
    })
    prisma.deployment.findFirst.mockResolvedValue({
      id: 'dep_1',
      projectId: 'proj_1',
      userId: 'user_1',
      status: 'LIVE',
      url: 'http://localhost:5173/deploy/dep_1',
      version: { id: 'ver_1', label: 'v1', fileCount: 1, totalSize: 20, createdAt: new Date() },
    })

    const svc = new DeploymentService()
    const result = await svc.getDeploymentStatus('user_1', 'proj_1')

    expect(result.deployment.status).toBe('LIVE')
    expect(result.deployment.url).toBe('http://localhost:5173/deploy/dep_1')
  })

  it('throws 403 when accessing another user project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_2',
    })
    const svc = new DeploymentService()
    await expect(svc.getDeploymentHistory('user_1', 'proj_1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})
