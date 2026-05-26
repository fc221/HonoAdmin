import type { Context } from 'hono'
import type { AppEnv } from '../../infra/runtime/types'
import { env } from 'hono/adapter'

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const allowedPaths = new Set(['/admin/login', '/admin/logout'])
const demoFailureMessage = '演示模式下禁止修改数据，如需体验完整功能请本地部署。'

export function isDemoModeEnabled(c: Context<AppEnv>): boolean {
  const bindings = env(c) as { DEMO_MODE?: string }
  const flag = (bindings.DEMO_MODE ?? '').toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes'
}

export async function rejectDemoWrite(c: Context<AppEnv>): Promise<Response | null> {
  if (!isDemoModeEnabled(c)) {
    return null
  }

  if (!writeMethods.has(c.req.method.toUpperCase())) {
    return null
  }

  if (allowedPaths.has(c.req.path)) {
    return null
  }

  const accept = c.req.header('accept')?.toLowerCase() ?? ''
  const wantsJson = accept.includes('application/json')
  const wantsTurbo = accept.includes('text/vnd.turbo-stream.html')
    || !!c.req.header('turbo-frame')

  if (wantsJson) {
    return c.json({
      error: { code: 'FORBIDDEN', message: demoFailureMessage },
      ok: false,
    }, 403)
  }

  if (wantsTurbo) {
    return c.text(demoFailureMessage, 403)
  }

  return c.text(demoFailureMessage, 403)
}
