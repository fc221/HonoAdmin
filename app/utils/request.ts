export function getClientIp(source: { req: { header: (name: string) => string | undefined } } | Request): string {
  const header = (name: string): string | undefined =>
    source instanceof Request
      ? source.headers.get(name) ?? undefined
      : source.req.header(name)

  return (
    header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? header('x-real-ip')
    ?? 'unknown'
  )
}
