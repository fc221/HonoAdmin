declare global {
  const __APP_NAME__: string
  const __APP_VERSION__: string
  const __APP_RUNTIME_TARGET__: 'bun' | 'cloudflare-workers'
}

export {}
