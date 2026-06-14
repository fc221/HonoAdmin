export function getAppName(): string {
  return typeof __APP_NAME__ === 'undefined' ? 'hono-admin' : __APP_NAME__
}

export function getAppVersion(): string {
  return typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__
}
