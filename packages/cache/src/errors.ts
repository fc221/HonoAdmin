export class CacheError extends Error {
  readonly cause?: unknown
  readonly key?: string

  constructor(message: string, options: { cause?: unknown, key?: string } = {}) {
    super(message)
    this.name = 'CacheError'
    this.cause = options.cause
    this.key = options.key
  }
}
