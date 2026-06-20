#!/usr/bin/env bun
/**
 * 一条命令并行拉起 server 与 console 的开发服务器。
 *
 * 端口用环境变量配置(不传则用默认):
 *   SERVER_PORT  默认 3001 —— server 监听端口,同时也是 console 的 /api、/uploads 代理目标
 *   CONSOLE_PORT 默认 5174 —— console 监听端口
 * 改 SERVER_PORT 一处即可让两边对上,例如:`SERVER_PORT=3005 bun run dev`。
 *
 * 不用 `bun --filter`:console 依赖 server(workspace:*),--filter 按依赖拓扑顺序执行,
 * 会等 server 的 dev 跑完再启 console,而 vite 常驻不退出 → console 永远起不来。
 * 这里直接并行 spawn,互不阻塞。
 */
import { fileURLToPath } from 'node:url'

const rootUrl = new URL('../', import.meta.url)

const serverPort = process.env.SERVER_PORT ?? '3001'
const consolePort = process.env.CONSOLE_PORT ?? '5174'

// 关键:把解析后的端口显式写回子进程环境。server 监听端口、console 监听端口、
// 以及 console 的 /api 代理目标都从这两个变量读取;不下传的话子进程会各自回退默认端口,
// 导致 console 的代理打到别的项目(端口被占时 vite 自增更会放大这个问题)。
const childEnv = { ...process.env, CONSOLE_PORT: consolePort, SERVER_PORT: serverPort }

const targets = [
  { name: 'server', dir: 'apps/server/' },
  { name: 'console', dir: 'apps/console/' },
]

console.log(`▶ server  http://127.0.0.1:${serverPort}`)
console.log(`▶ console http://127.0.0.1:${consolePort}  (/api, /uploads → :${serverPort})`)

const procs = targets.map(({ dir }) =>
  Bun.spawn(['bun', 'run', 'dev'], {
    cwd: fileURLToPath(new URL(dir, rootUrl)),
    env: childEnv,
    stdio: ['inherit', 'inherit', 'inherit'],
  }),
)

let shuttingDown = false
function shutdown(): void {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  for (const proc of procs) {
    proc.kill()
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// 任一进程退出就连带关掉另一个,避免留下半边孤儿进程。
await Promise.race(procs.map((proc) => proc.exited))
shutdown()
await Promise.all(procs.map((proc) => proc.exited))
