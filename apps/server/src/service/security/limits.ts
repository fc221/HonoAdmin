import type { SecurityRuntimeConfig } from '@hono-admin/runtime/security-config'
import type { ServiceRequestContext } from '../types'
import { defaultSecurityRuntimeConfig } from '@hono-admin/runtime/security-config'
import { listConfigs } from '../admin/system/config'

export interface SecurityLimits extends SecurityRuntimeConfig {
  apiRateLimitEnabled: boolean
}

/**
 * 限流阈值的真源:后台「安全配置」→ 环境变量 → 内置默认值。
 * listConfigs 自带缓存(配置一改就失效),所以每个请求读它不会打库。
 */
export async function resolveSecurityLimits(
  c: ServiceRequestContext,
): Promise<SecurityLimits> {
  const runtime = c.config?.security ?? defaultSecurityRuntimeConfig
  const values = await readSecurityConfigValues(c)

  return {
    ...runtime,
    apiRateLimitEnabled: values.api_rate_limit_enabled !== 'false',
    apiRateLimitMax: positiveInteger(values.api_rate_limit_max, runtime.apiRateLimitMax),
    apiRateLimitWindowSeconds: positiveInteger(
      values.api_rate_limit_window_seconds,
      runtime.apiRateLimitWindowSeconds,
    ),
    loginRateLimitAccountMax: positiveInteger(
      values.login_rate_limit_account_max,
      runtime.loginRateLimitAccountMax,
    ),
    loginRateLimitIpMax: positiveInteger(
      values.login_rate_limit_ip_max,
      runtime.loginRateLimitIpMax,
    ),
    loginRateLimitWindowSeconds: positiveInteger(
      values.login_rate_limit_window_seconds,
      runtime.loginRateLimitWindowSeconds,
    ),
  }
}

async function readSecurityConfigValues(
  c: ServiceRequestContext,
): Promise<Record<string, string>> {
  const configs = await listConfigs(c).catch(() => [])
  const values: Record<string, string> = {}

  for (const config of configs) {
    if (config.configType === 'security') {
      values[config.configKey] = config.configValue
    }
  }

  return values
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
