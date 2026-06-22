import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// SERVER_PORT 同时决定 server 监听端口和这里的 proxy 目标,改一处即可。
const serverTarget = `http://127.0.0.1:${process.env.SERVER_PORT ?? '3000'}`

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // 把稳定且体积大的第三方库抽到独立 vendor chunk,让首屏 index 瘦下去:
        //   - vendor-vue:框架核心,每次发版几乎不变,可长缓存;
        //   - vendor-iconify:图标运行时。
        // naive-ui 不强制合并——它的组件按需 import,rollup 会按使用方自然分配到各页面 chunk
        // 或共享时自动提取;强制 manualChunks 反而会把懒加载组件塞成一个巨型 vendor 块。
        // 业务代码按 view 已经走 import.meta.glob 懒加载,这里只管 vendor。
        manualChunks(id) {
          const modulePath = id.replaceAll('\\', '/')
          if (!modulePath.includes('/node_modules/')) {
            return undefined
          }
          if ([
            '/node_modules/@vue/',
            '/node_modules/pinia',
            '/node_modules/pinia-plugin-persistedstate',
            '/node_modules/vue/',
            '/node_modules/vue-router/',
          ].some((part) => modulePath.includes(part))) {
            return 'vendor-vue'
          }
          if (modulePath.includes('/node_modules/@iconify/')) {
            return 'vendor-iconify'
          }
          return undefined
        },
      },
    },
  },
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
