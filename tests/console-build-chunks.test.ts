import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

// 这个测试守护 console 构建产物的 chunk 体积与 vendor 拆分约定:
//   1. 任何单个 JS chunk 不得超过 500 kB(Vite 默认告警阈值),否则首屏体积恶化。
//      index chunk 当前 ~435 kB,装的是 naive-ui 首屏组件 + 传递依赖(lodash-es/vueuc 等)
//      + 业务公共代码,都是首屏必需,再拆会导致布局闪烁(违反 AGENTS.md「不允许 header/sidebar 抖动」)。
//   2. 必须存在 vendor-vue 拆分块,证明 manualChunks 生效,
//      而不是靠调高 chunkSizeWarningLimit 掩盖问题。
//   3. 隐性守护:console router 必须从 @hono-admin/server/api/menu 导入菜单常量,
//      而不是 @hono-admin/server/api/schema——后者会把 zod 运行时(数百 kB)拉进 index chunk。
//      若本测试因 index 超过 500 kB 失败,先用 sourcemap 分析是否有人重新引入了 zod。
// 运行前需要先 `bun run build` 产出 dist/。

const consoleDistDir = join(import.meta.dir, '../apps/console/dist/assets')
const CHUNK_SIZE_LIMIT_KB = 500

function listJsChunks(dir: string): { name: string, sizeKb: number }[] {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => ({
      name,
      sizeKb: Math.round(statSync(join(dir, name)).size / 1024),
    }))
}

describe('console build chunk budget', () => {
  const chunks = listJsChunks(consoleDistDir)

  test('dist exists (run `bun run build` first)', () => {
    // 如果 dist 不存在,说明测试在 build 之前跑——给出明确指引而不是 obscure 错误。
    expect(chunks.length).toBeGreaterThan(0)
  })

  test('no single JS chunk exceeds the size budget', () => {
    const over = chunks.filter((chunk) => chunk.sizeKb > CHUNK_SIZE_LIMIT_KB)
    if (over.length > 0) {
      const detail = over
        .map((chunk) => `${chunk.name} = ${chunk.sizeKb} kB`)
        .join('\n  ')
      throw new Error(
        `以下 chunk 超过 ${CHUNK_SIZE_LIMIT_KB} kB 预算:\n  ${detail}\n`
        + `检查 vite.config.ts 的 manualChunks,或对超大模块做 dynamic import()。`,
      )
    }
  })

  test('vendor-vue is split into its own chunk', () => {
    // vendor 拆分生效的信号:存在 vendor-vue chunk。
    // 若失败,说明 vite.config.ts 的 manualChunks 配置丢失或失效。
    const hasVendorVue = chunks.some((chunk) => chunk.name.startsWith('vendor-vue'))
    expect(hasVendorVue).toBe(true)
  })
})
