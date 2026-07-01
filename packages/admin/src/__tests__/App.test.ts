import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import ElementPlus from 'element-plus'

// 模拟 API 调用
vi.mock('../api', () => ({
  getProjects: vi.fn().mockResolvedValue({ data: [] }),
}))

describe('App.vue', () => {
  it('应该渲染“新建项目”按钮', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [ElementPlus],
      },
    })
    expect(wrapper.text()).toContain('新建项目')
  })
})