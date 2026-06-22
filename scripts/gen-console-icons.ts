#!/usr/bin/env bun
/**
 * 扫描 console + server 源码里用到的 `ri:*` 图标,从 @iconify-json/ri 全集抽出子集,
 * 生成 apps/console/src/icons/ri-offline.ts。main.ts 用 addCollection 离线注册后,
 * 图标同步即时渲染,不再向 api.iconify.design 异步拉取(也就不会"图标比文字慢"),
 * 且离线 / Cloudflare Workers 部署同样可用。
 *
 * 新增 / 改动菜单图标后重新生成:bun run scripts/gen-console-icons.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootUrl = new URL('../', import.meta.url)
const root = fileURLToPath(rootUrl)
const scanDirs = ['apps/console/src', 'apps/server/src']
const outFile = join(root, 'apps/console/src/icons/ri-offline.ts')

// 1) 收集源码中用到的 ri 图标名
const used = new Set<string>()
const iconPattern = /ri:([a-z0-9]+(?:-[a-z0-9]+)*)/g
function walk(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue
    }
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }
    if (!(/\.(?:ts|tsx|vue)$/).test(entry.name)) {
      continue
    }
    const text = readFileSync(full, 'utf8')
    for (const match of text.matchAll(iconPattern)) {
      used.add(match[1])
    }
  }
}
for (const dir of scanDirs) {
  walk(join(root, dir))
}

// 2) 从 ri 全集抽出子集(@iconify-json/ri 是 console 的依赖,以 console 包为锚点解析)
const consoleRequire = createRequire(join(root, 'apps/console/package.json'))
const ri = JSON.parse(
  readFileSync(consoleRequire.resolve('@iconify-json/ri/icons.json'), 'utf8'),
) as {
  prefix: string
  width?: number
  height?: number
  icons: Record<string, unknown>
}

const icons: Record<string, unknown> = {}
const missing: string[] = []
for (const name of [...used].sort()) {
  if (ri.icons[name]) {
    icons[name] = ri.icons[name]
  } else {
    missing.push(name)
  }
}

const subset = {
  height: ri.height,
  icons,
  prefix: ri.prefix,
  width: ri.width,
}

// 3) 写出生成文件
const banner = '// 本文件由 scripts/gen-console-icons.ts 生成,请勿手改。\n'
  + '// 重新生成:bun run scripts/gen-console-icons.ts\n'
const body = `import type { IconifyJSON } from '@iconify/vue'\n\n`
  + `export const riOfflineIcons: IconifyJSON = ${JSON.stringify(subset)}\n`
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, banner + body)

console.log(`✓ 写入 ${Object.keys(icons).length} 个 ri 图标 → ${outFile.replace(root, '')}`)
if (missing.length) {
  console.warn(`⚠ ri 全集中缺失(将回退 API):${missing.join(', ')}`)
}
