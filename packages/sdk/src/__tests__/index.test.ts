import { describe, it, expect, beforeAll } from 'vitest'
import { initMock } from '../index'

// 模拟规则拉取
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([
    {
      type: 'http',
      method: 'GET',
      url: '/api/test',
      mode: 'static',
      responseData: { hello: 'world' },
      statusCode: 200,
    },
  ]),
})

beforeAll(async () => {
  await initMock({ projectKey: 'test', baseURL: '' })
})

describe('SDK HTTP interception', () => {
  it('应该拦截匹配的 fetch 请求并返回 mock 数据', async () => {
    const res = await fetch('/api/test')
    const data = await res.json()
    expect(data).toEqual({ hello: 'world' })
  })
})