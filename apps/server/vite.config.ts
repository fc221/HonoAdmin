import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/entry/dev.ts',
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.SERVER_PORT) || 3000,
    // 端口被占时直接报错,而不是静默自增到别的端口(否则 console 代理会指错目标)。
    strictPort: true,
  },
})
