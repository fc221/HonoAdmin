#!/usr/bin/env bun
/**
 * 编排应用构建,产出可直接部署的 `apps/server/dist/`:
 *   1) vite/astro 构建 console 与 public
 *   2) bun build 出 server 入口(默认 --target=bun,可加 --target=node 切到 Node 入口)
 *   3) 把 console/public 的 dist 拷到 server/dist/static/{console,public}
 *
 * 默认:`bun apps/server/dist/bun.js` 在任意机器上跑起。
 * `--target=node`:`node apps/server/dist/node.js` 用 Node 跑(需带 static/ 一起部署)。
 * `--compile`:产出单文件 `apps/server/dist/hono-admin`(只支持 bun target)。
 */
import { cp, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const rootUrl = new URL('../', import.meta.url)
const rootPath = fileURLToPath(rootUrl)
const consoleDistUrl = new URL('apps/console/dist/', rootUrl)
const publicDistUrl = new URL('apps/public/dist/', rootUrl)
const serverDistUrl = new URL('apps/server/dist/', rootUrl)
const serverStaticUrl = new URL('apps/server/dist/static/', rootUrl)

const targetArg = process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1]
const target: 'bun' | 'node' = targetArg === 'node' ? 'node' : 'bun'
const shouldCompile = process.argv.includes('--compile')
if (shouldCompile && target !== 'bun') {
  throw new Error('--compile 只支持 --target=bun')
}

async function run(cmd: string[], cwd: URL = rootUrl): Promise<void> {
  console.log(`▸ ${cmd.join(' ')}`)
  const proc = Bun.spawn(cmd, {
    cwd: fileURLToPath(cwd),
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  const code = await proc.exited
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(' ')}`)
  }
}

console.log('▶ Build console (vite)')
await run(['bun', 'run', 'build'], new URL('apps/console/', rootUrl))

console.log('▶ Build public (astro)')
await run(['bun', 'run', 'build'], new URL('apps/public/', rootUrl))

console.log(`▶ Build server (bun build --target=${target} → apps/server/dist/)`)
await rm(serverDistUrl, { force: true, recursive: true })
if (target === 'node') {
  await run([
    'bun',
    'build',
    'apps/server/src/entry/node.ts',
    '--target=node',
    `--define=__APP_RUNTIME_TARGET__="node"`,
    '--outdir=apps/server/dist',
  ])
} else {
  await run([
    'bun',
    'build',
    'apps/server/src/entry/bun.ts',
    '--target=bun',
    '--outdir=apps/server/dist',
  ])
}

console.log('▶ Bundle console + public dist into apps/server/dist/static/')
await mkdir(serverStaticUrl, { recursive: true })
await cp(consoleDistUrl, new URL('console/', serverStaticUrl), { recursive: true })
await cp(publicDistUrl, new URL('public/', serverStaticUrl), { recursive: true })

// `--compile`:再编一个单文件 hono-admin。部署形态:hono-admin + 同级 static/。
if (shouldCompile) {
  console.log('▶ Compile single binary (apps/server/dist/hono-admin)')
  await run([
    'bun',
    'build',
    '--compile',
    '--minify',
    '--sourcemap',
    'apps/server/dist/bun.js',
    '--outfile',
    'apps/server/dist/hono-admin',
  ])
}

console.log(`✓ Build complete: ${rootPath}apps/server/dist/`)
