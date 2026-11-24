import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const owner = { email: 'owner@example.com', password: 'Password123!', name: 'Owner' }
const attacker = { email: 'attacker@example.com', password: 'Password123!', name: 'Attacker' }

let ownerToken = ''
let attackerToken = ''
let projectId = ''

describe('Preview status — ownership enforcement (IDOR fix)', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, attacker.email] } } })

    const regOwner = await request.post('/api/v1/auth/register').send(owner)
    expect(regOwner.status).toBe(201)
    const ownerLogin = await request.post('/api/v1/auth/login').send({
      email: owner.email,
      password: owner.password,
    })
    ownerToken = ownerLogin.body.data.accessToken

    const regAttacker = await request.post('/api/v1/auth/register').send(attacker)
    expect(regAttacker.status).toBe(201)
    const attackerLogin = await request.post('/api/v1/auth/login').send({
      email: attacker.email,
      password: attacker.password,
    })
    attackerToken = attackerLogin.body.data.accessToken

    // Owner creates a project
    const create = await request
      .post('/api/v1/projects/')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Project', description: 'owned by owner' })
    expect(create.status).toBe(201)
    projectId = create.body.data.project.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [owner.email, attacker.email] } } })
    await prisma.$disconnect()
  })

  it('owner can access their own preview status', async () => {
    const res = await request
      .get(`/api/v1/preview/${projectId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
    expect(res.body.success).toBe(true)
  })

  it('non-owner CANNOT access another user\'s preview status', async () => {
    const res = await request
      .get(`/api/v1/preview/${projectId}/status`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .expect(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND')
  })
})
