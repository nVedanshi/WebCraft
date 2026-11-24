import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

let accessToken = ''
let projectId = ''

describe('Project and File API', () => {
  beforeAll(async () => {
    // Authenticate as a test user
    const email = 'pf@example.com'
    await prisma.user.delete({ where: { email } }).catch(() => {})
    await prisma.user.create({
      data: {
        email,
        passwordHash: '$2b$12$test.hash.placeholder.do.not.use',
        name: 'PF Tester',
        credits: 100,
      },
    })
    // Log in via a freshly created password is not possible with a placeholder
    // hash, so register a real user instead.
    await prisma.user.delete({ where: { email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'PF Tester' })
    accessToken = reg.body.data.accessToken
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates a project', async () => {
    const res = await request
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Project', description: 'desc' })
      .expect(201)
    expect(res.body.success).toBe(true)
    projectId = res.body.data.project.id
    expect(projectId).toBeDefined()
  })

  it('lists projects', async () => {
    const res = await request
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.projects)).toBe(true)
    expect(res.body.data.projects.some((p) => p.id === projectId)).toBe(true)
  })

  it('gets a project', async () => {
    const res = await request
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.data.project.id).toBe(projectId)
  })

  it('updates a project', async () => {
    const res = await request
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed Project' })
      .expect(200)
    expect(res.body.data.project.name).toBe('Renamed Project')
  })

  it('creates a file', async () => {
    const res = await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: 'src/App.jsx', content: 'export default App', type: 'file' })
      .expect(201)
    expect(res.body.data.file.path).toBe('src/App.jsx')
  })

  it('lists files', async () => {
    const res = await request
      .get(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.data.files.some((f) => f.path === 'src/App.jsx')).toBe(true)
  })

  it('reads a file', async () => {
    const res = await request
      .get(`/api/v1/${projectId}/files/src/App.jsx`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.data.file.content).toBe('export default App')
  })

  it('updates a file with revision concurrency', async () => {
    // Get current revision
    const proj = await request
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    const rev = proj.body.data.project.revisionId

    const res = await request
      .put(`/api/v1/${projectId}/files/src/App.jsx`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'export default App v2', expectedRevisionId: rev })
      .expect(200)
    expect(res.body.data.file.content).toBe('export default App v2')
  })

  it('rejects path traversal on file create', async () => {
    await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: '../../etc/passwd', content: 'x' })
      .expect(400)
  })

  it('rejects stale revision (409 conflict)', async () => {
    await request
      .put(`/api/v1/${projectId}/files/src/App.jsx`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'stale', expectedRevisionId: 'stale-id' })
      .expect(409)
  })

  it('deletes a file', async () => {
    const proj = await request
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
    const rev = proj.body.data.project.revisionId
    await request
      .delete(`/api/v1/${projectId}/files/src/App.jsx?expectedRevisionId=${rev}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
  })

  it('archives and soft-deletes a project', async () => {
    await request
      .post(`/api/v1/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    await request
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
  })
})
