import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

let accessToken = ''
let templateId = ''

describe('Template Marketplace API', () => {
  beforeAll(async () => {
    const email = 'tmpl@example.com'
    await prisma.user.delete({ where: { email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'TM Tester' })
    accessToken = reg.body.data.accessToken

    // Seed a known template for use-template tests
    const tpl = await prisma.template.upsert({
      where: { slug: 'test-template-use' },
      update: {},
      create: {
        name: 'Test Template',
        slug: 'test-template-use',
        description: 'A test template',
        category: 'dashboard',
        stack: { framework: 'React', styling: 'Tailwind CSS' },
        isPublished: true,
      },
    })
    templateId = tpl.id

    await prisma.templateFile.upsert({
      where: { templateId_path: { templateId: tpl.id, path: 'src/App.jsx' } },
      update: {},
      create: {
        templateId: tpl.id,
        path: 'src/App.jsx',
        content: 'export default App',
        type: 'file',
        size: 17,
      },
    })
    await prisma.templateFile.upsert({
      where: { templateId_path: { templateId: tpl.id, path: 'package.json' } },
      update: {},
      create: {
        templateId: tpl.id,
        path: 'package.json',
        content: '{}',
        type: 'file',
        size: 2,
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /templates', () => {
    it('lists published templates', async () => {
      const res = await request.get('/api/v1/templates').expect(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.templates)).toBe(true)
      expect(res.body.data.templates.length).toBeGreaterThan(0)
    })

    it('returns categories', async () => {
      const res = await request.get('/api/v1/templates').expect(200)
      expect(Array.isArray(res.body.data.categories)).toBe(true)
      expect(res.body.data.categories.length).toBeGreaterThan(0)
    })

    it('filters by category', async () => {
      const res = await request
        .get('/api/v1/templates')
        .query({ category: 'dashboard' })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.templates.every((t) => t.category === 'dashboard')).toBe(true)
    })

    it('searches by name', async () => {
      const res = await request
        .get('/api/v1/templates')
        .query({ search: 'test' })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.templates.length).toBeGreaterThan(0)
      expect(res.body.data.templates.some((t) => t.name.toLowerCase().includes('test'))).toBe(true)
    })

    it('supports pagination with cursor', async () => {
      const res = await request
        .get('/api/v1/templates')
        .query({ take: 1 })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.templates.length).toBeLessThanOrEqual(1)
      expect(res.body.data.hasMore).toBeDefined()
    })

    it('sorts by name ascending', async () => {
      const res = await request
        .get('/api/v1/templates')
        .query({ sort: 'name', order: 'asc' })
        .expect(200)
      expect(res.body.success).toBe(true)
      const names = res.body.data.templates.map((t) => t.name)
      expect(names).toEqual([...names].sort())
    })
  })

  describe('GET /templates/categories', () => {
    it('returns category list', async () => {
      const res = await request.get('/api/v1/templates/categories').expect(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.categories)).toBe(true)
    })
  })

  describe('GET /templates/:templateId', () => {
    it('returns a single template with files', async () => {
      const res = await request
        .get(`/api/v1/templates/${templateId}`)
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.template.id).toBe(templateId)
      expect(res.body.data.template.files).toBeDefined()
      expect(res.body.data.template.files.length).toBe(2)
    })

    it('returns 404 for unknown template', async () => {
      await request
        .get('/api/v1/templates/c0f8abc123def456ghi789jkl01')
        .expect(404)
    })
  })

  describe('POST /templates/:templateId/use (auth required)', () => {
    it('creates a project from a template', async () => {
      const res = await request
        .post(`/api/v1/templates/${templateId}/use`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'My Template Project' })
        .expect(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.project.userId).toBeDefined()
      expect(res.body.data.project.name).toBe('My Template Project')
      expect(res.body.data.project.settings.createdFromTemplate).toBe(true)
    })

    it('copies template files into the new project', async () => {
      const res = await request
        .post(`/api/v1/templates/${templateId}/use`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'File Copy Test' })
        .expect(201)
      const projectId = res.body.data.project.id

      const filesRes = await request
        .get(`/api/v1/${projectId}/files`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const files = filesRes.body?.data?.files ?? []
      const paths = files.map((f) => f.path)
      expect(paths).toContain('src/App.jsx')
      expect(paths).toContain('package.json')

      const appFile = await request
        .get(`/api/v1/${projectId}/files/src/App.jsx`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(appFile.body.data.file.content).toBe('export default App')
    })

    it('requires authentication', async () => {
      await request
        .post(`/api/v1/templates/${templateId}/use`)
        .send({ name: 'Unauthorized' })
        .expect(401)
    })

    it('returns 404 for unknown template', async () => {
      await request
        .post('/api/v1/templates/c0f8abc123def456ghi789jkl01/use')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Nope' })
        .expect(404)
    })

    it('isolates projects between users', async () => {
      const email2 = 'tmpl2@example.com'
      await prisma.user.delete({ where: { email: email2 } }).catch(() => {})
      const reg2 = await request
        .post('/api/v1/auth/register')
        .send({ email: email2, password: 'Password123!', name: 'TM Tester 2' })
      const accessToken2 = reg2.body.data.accessToken

      const res = await request
        .post(`/api/v1/templates/${templateId}/use`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({ name: 'User 2 Project' })
        .expect(201)

      const projectId = res.body.data.project.id

      // User 1 cannot access user 2's project
      await request
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })
  })
})
