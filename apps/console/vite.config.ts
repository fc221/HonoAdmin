import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// SERVER_PORT 同时决定 server 监听端口和这里的 proxy 目标,改一处即可。
const serverTarget = `http://127.0.0.1:${process.env.SERVER_PORT ?? '3000'}`

export default defineConfig({
  base: '/',
  plugins: [vue(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.CONSOLE_PORT) || 5173,
    // 端口被占时直接报错,而不是静默自增(避免误以为还在原端口)。
    strictPort: true,
    proxy: {
      '/api': serverTarget,
      '/uploads': serverTarget,
    },
  },
})
