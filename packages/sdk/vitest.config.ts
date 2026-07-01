import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',       // 需要浏览器 API（fetch, WebSocket 等）
  },
})