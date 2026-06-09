export class RuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ConfigurationError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super('CONFIGURATION_ERROR', message, details)
  }
}

export class DatabaseError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, details)
  }
}

export class CacheError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super('CACHE_ERROR', message, details)
  }
}
