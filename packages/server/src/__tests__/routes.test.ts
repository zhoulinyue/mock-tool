import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import routes from '../routes.ts'

const app = express()
app.use(express.json())
app.use(routes)

describe('Projects API', () => {
  let projectId: string

  it('GET /api/projects 应该返回空数组', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /api/projects 应该创建一个项目', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Test', key: 'test-key' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test')
    projectId = res.body.id
  })

  it('GET /api/projects/:id/rules 应该返回空规则', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/rules`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})