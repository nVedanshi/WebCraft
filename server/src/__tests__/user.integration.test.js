import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'usersvc@example.com',
  password: 'Password123!',
  name: 'User Service Tester',
}

let accessToken = ''
let userId = ''

describe('User Service API', () => {
  beforeAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: testUser.password, name: testUser.name })
    accessToken = reg.body.data.accessToken
    userId = reg.body.data.user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('gets current user profile', async () => {
    const res = await request
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
    expect(res.body.data.user.passwordHash).toBeUndefined()
  })

  it('updates profile name', async () => {
    const res = await request
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.name).toBe('Updated Name')
  })

  it('changes password successfully', async () => {
    const res = await request
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: testUser.password, newPassword: 'NewPassword123!' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.changed).toBe(true)
  })

  it('rejects wrong current password', async () => {
    const res = await request
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' })
      .expect(401)
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD')
  })

  it('can log in with new password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'NewPassword123!' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()
  })
})
