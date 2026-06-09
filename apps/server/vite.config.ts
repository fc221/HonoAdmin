import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/dev.ts',
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
})
