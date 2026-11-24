import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const owner = { email: 'owner@example.com', password: 'Password123!', name: 'Owner' }
const editor = { email: 'editor@example.com', password: 'Password123!', name: 'Editor' }
const viewer = { email: 'viewer@example.com', password: 'Password123!', name: 'Viewer' }
const nonMember = { email: 'nonmember@example.com', password: 'Password123!', name: 'NonMember' }

let ownerToken = ''
let projectId = ''
let editorUserId = ''
let viewerUserId = ''
let nonMemberUserId = ''
let ownerUserId = ''

describe('ProjectMember — roles and backfill', () => {
  beforeAll(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: { email: { in: [owner.email, editor.email, viewer.email, nonMember.email] } },
    }).catch(() => {})

    // Register all users (ignore 409 if user already exists from another test)
    await request.post('/api/v1/auth/register').send(owner).catch(() => {})
    await request.post('/api/v1/auth/register').send(editor).catch(() => {})
    await request.post('/api/v1/auth/register').send(viewer).catch(() => {})
    await request.post('/api/v1/auth/register').send(nonMember).catch(() => {})

    // Log in all users to get tokens and IDs
    const ownerLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: owner.email, password: owner.password })
    ownerToken = ownerLogin.body.data.accessToken
    ownerUserId = ownerLogin.body.data.user.id

    const editorLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: editor.email, password: editor.password })
    editorUserId = editorLogin.body.data.user.id

    const viewerLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: viewer.email, password: viewer.password })
    viewerUserId = viewerLogin.body.data.user.id

    const nonMemberLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: nonMember.email, password: nonMember.password })
    nonMemberUserId = nonMemberLogin.body.data.accessToken && nonMemberLogin.body.data.user.id

    // Owner creates a project
    const create = await request
      .post('/api/v1/projects/')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Collab Project', description: 'Test project' })
    expect(create.status).toBe(201)
    projectId = create.body.data.project.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [owner.email, editor.email, viewer.email, nonMember.email] } },
    }).catch(() => {})
    await prisma.$disconnect()
  })

  it('existing owner behavior unchanged — owner can access their project via userId', async () => {
    const res = await request
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.project.id).toBe(projectId)
  })

  it('owner can be granted an explicit OWNER ProjectMember row (simulating backfill)', async () => {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: ownerUserId,
        role: 'OWNER',
        invitedBy: null,
      },
    })
    expect(member.role).toBe('OWNER')
    expect(member.projectId).toBe(projectId)
    expect(member.userId).toBe(ownerUserId)
  })

  it('creates an EDITOR membership for another user', async () => {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: editorUserId,
        role: 'EDITOR',
        invitedBy: ownerUserId,
      },
    })
    expect(member.role).toBe('EDITOR')
    expect(member.projectId).toBe(projectId)
    expect(member.userId).toBe(editorUserId)
  })

  it('creates a VIEWER membership for another user', async () => {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: viewerUserId,
        role: 'VIEWER',
        invitedBy: ownerUserId,
      },
    })
    expect(member.role).toBe('VIEWER')
    expect(member.projectId).toBe(projectId)
    expect(member.userId).toBe(viewerUserId)
  })

  it('enforces unique (projectId, userId) constraint', async () => {
    await expect(
      prisma.projectMember.create({
        data: {
          projectId,
          userId: editorUserId,
          role: 'VIEWER',
        },
      })
    ).rejects.toThrow()
  })

  it('non-member has no ProjectMember row', async () => {
    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: nonMemberUserId },
    })
    expect(membership).toBeNull()
  })

  it('cleanup: delete created memberships except owner backfill', async () => {
    await prisma.projectMember.deleteMany({
      where: { projectId, userId: { in: [editorUserId, viewerUserId] } },
    }).catch(() => {})

    // Owner OWNER row should remain (simulating backfill persistence)
    const ownerMembership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: ownerUserId },
      },
    })
    expect(ownerMembership).not.toBeNull()
    expect(ownerMembership.role).toBe('OWNER')
  })
})
