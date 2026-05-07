export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class FailError extends AppError {
  constructor(message: string, details?: unknown) {
    super('FAIL', message, 500, details)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, 404, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super('UNAUTHORIZED', message, 401, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super('FORBIDDEN', message, 403, details)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string, details?: unknown) {
    super('RATE_LIMITED', message, 429, details)
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFIGURATION_ERROR', message, 500, details)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, 500, details)
  }
}

export class CacheError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CACHE_ERROR', message, 500, details)
  }
}

/** 把异常对象收敛成统一的 HTTP 错误响应结构。 */
export function toErrorShape(error: unknown) {
  if (error instanceof AppError) {
    const isInternalError = error.status >= 500
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: isInternalError ? '服务暂时不可用。' : error.message,
          details: isInternalError ? undefined : error.details,
        },
      },
    }
  }

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务暂时不可用。',
      },
    },
  }
}
