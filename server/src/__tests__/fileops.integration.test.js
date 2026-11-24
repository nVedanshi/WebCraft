import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'fileops@example.com',
  password: 'Password123!',
  name: 'File Ops Tester',
}

let accessToken = ''
let projectId = ''
let revisionId = ''

async function getRevision() {
  const res = await request
    .get(`/api/v1/projects/${projectId}`)
    .set('Authorization', `Bearer ${accessToken}`)
  return res.body.data.project.revisionId
}

describe('File Operations API', () => {
  beforeAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: testUser.password, name: testUser.name })
    accessToken = reg.body.data.accessToken

    const proj = await request
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'File Ops Project', description: 'Testing file ops' })
    projectId = proj.body.data.project.id
    revisionId = proj.body.data.project.revisionId
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('creates a file with revision check', async () => {
    revisionId = await getRevision()
    const res = await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: 'src/Button.jsx', content: 'export default Button', type: 'file', expectedRevisionId: revisionId })
      .expect(201)
    expect(res.body.data.file.path).toBe('src/Button.jsx')
  })

  it('rejects create file with stale revision', async () => {
    await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: 'src/Stale.jsx', content: 'stale', type: 'file', expectedRevisionId: 'stale-id' })
      .expect(409)
  })

  it('renames a file with revision check', async () => {
    revisionId = await getRevision()
    const res = await request
      .patch(`/api/v1/${projectId}/files/src/Button.jsx`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPath: 'src/components/Button.jsx', expectedRevisionId: revisionId })
      .expect(200)
    expect(res.body.data.file.path).toBe('src/components/Button.jsx')
  })

  it('rejects rename to existing path', async () => {
    // Create another file first
    revisionId = await getRevision()
    await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: 'src/Target.jsx', content: 'target', type: 'file', expectedRevisionId: revisionId })

    // Try renaming Button.jsx to Target.jsx (exists)
    revisionId = await getRevision()
    await request
      .patch(`/api/v1/${projectId}/files/src/components/Button.jsx`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPath: 'src/Target.jsx', expectedRevisionId: revisionId })
      .expect(409)
  })

  it('deletes a file with revision check', async () => {
    revisionId = await getRevision()
    const res = await request
      .delete(`/api/v1/${projectId}/files/src/components/Button.jsx?expectedRevisionId=${revisionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.data.deleted).toBe(true)
  })

  it('rejects path traversal with absolute path', async () => {
    await request
      .post(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: '/etc/passwd', content: 'x' })
      .expect(400)
  })

  it('lists remaining files', async () => {
    const res = await request
      .get(`/api/v1/${projectId}/files`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    const paths = res.body.data.files.map((f) => f.path)
    expect(paths).toContain('src/Target.jsx')
    expect(paths).not.toContain('src/components/Button.jsx')
  })
})
