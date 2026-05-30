import type { ServiceRequestContext } from '../types'
import { buildCacheKey } from '../../infra/cache/types'
import { TooManyRequestsError } from '../../utils/errors'

type RateLimitContext = Pick<ServiceRequestContext, 'cache'>

interface RateLimitOptions {
  key: string
  limit: number
  windowSeconds: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

export async function consumeRateLimit(
  c: RateLimitContext,
  options: RateLimitOptions,
): Promise<void> {
  const now = Date.now()
  const cached = await c.cache.get<RateLimitEntry>(options.key)
  const entry = isRateLimitEntry(cached) && cached.resetAt > now
    ? cached
    : { count: 0, resetAt: now + options.windowSeconds * 1000 }

  if (entry.count >= options.limit) {
    throw new TooManyRequestsError('请求过于频繁，请稍后再试。', {
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    })
  }

  await c.cache.set(options.key, {
    count: entry.count + 1,
    resetAt: entry.resetAt,
  }, {
    ttlSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  })
}

export async function clearRateLimit(
  c: RateLimitContext,
  key: string,
): Promise<void> {
  await c.cache.delete(key).catch(() => {})
}

export async function createRateLimitKey(
  namespace: string,
  ...segments: Array<number | string | null | undefined>
): Promise<string> {
  const value = segments
    .map((segment) => String(segment ?? ''))
    .join('\u001F')
  return buildCacheKey('security', 'rate-limit', namespace, await sha256Hex(value))
}

function isRateLimitEntry(value: unknown): value is RateLimitEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const entry = value as Partial<RateLimitEntry>
  return (
    typeof entry.count === 'number'
    && typeof entry.resetAt === 'number'
  )
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
