export type SecurityRuntimeConfig = {
  apiRateLimitMax: number
  apiRateLimitWindowSeconds: number
  loginRateLimitAccountMax: number
  loginRateLimitIpMax: number
  loginRateLimitWindowSeconds: number
  maxRequestBodySizeBytes: number
  maxUploadImageSizeBytes: number
}

export type SecurityRuntimeConfigKey
  = | 'API_RATE_LIMIT_MAX'
    | 'API_RATE_LIMIT_WINDOW_SECONDS'
    | 'LOGIN_RATE_LIMIT_ACCOUNT_MAX'
    | 'LOGIN_RATE_LIMIT_IP_MAX'
    | 'LOGIN_RATE_LIMIT_WINDOW_SECONDS'
    | 'REQUEST_BODY_LIMIT_BYTES'
    | 'UPLOAD_IMAGE_LIMIT_BYTES'

export const defaultSecurityRuntimeConfig: SecurityRuntimeConfig = {
  apiRateLimitMax: 120,
  apiRateLimitWindowSeconds: 60,
  loginRateLimitAccountMax: 10,
  loginRateLimitIpMax: 30,
  loginRateLimitWindowSeconds: 15 * 60,
  maxRequestBodySizeBytes: 6 * 1024 * 1024,
  maxUploadImageSizeBytes: 5 * 1024 * 1024,
}

export function resolveSecurityRuntimeConfig(
  readValue: (key: SecurityRuntimeConfigKey) => string | undefined,
): SecurityRuntimeConfig {
  return {
    apiRateLimitMax: readPositiveInteger(
      readValue('API_RATE_LIMIT_MAX'),
      defaultSecurityRuntimeConfig.apiRateLimitMax,
    ),
    apiRateLimitWindowSeconds: readPositiveInteger(
      readValue('API_RATE_LIMIT_WINDOW_SECONDS'),
      defaultSecurityRuntimeConfig.apiRateLimitWindowSeconds,
    ),
    loginRateLimitAccountMax: readPositiveInteger(
      readValue('LOGIN_RATE_LIMIT_ACCOUNT_MAX'),
      defaultSecurityRuntimeConfig.loginRateLimitAccountMax,
    ),
    loginRateLimitIpMax: readPositiveInteger(
      readValue('LOGIN_RATE_LIMIT_IP_MAX'),
      defaultSecurityRuntimeConfig.loginRateLimitIpMax,
    ),
    loginRateLimitWindowSeconds: readPositiveInteger(
      readValue('LOGIN_RATE_LIMIT_WINDOW_SECONDS'),
      defaultSecurityRuntimeConfig.loginRateLimitWindowSeconds,
    ),
    maxRequestBodySizeBytes: readPositiveInteger(
      readValue('REQUEST_BODY_LIMIT_BYTES'),
      defaultSecurityRuntimeConfig.maxRequestBodySizeBytes,
    ),
    maxUploadImageSizeBytes: readPositiveInteger(
      readValue('UPLOAD_IMAGE_LIMIT_BYTES'),
      defaultSecurityRuntimeConfig.maxUploadImageSizeBytes,
    ),
  }
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
