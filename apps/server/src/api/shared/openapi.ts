import type { ResolverReturnType } from 'hono-openapi'
import type { ZodType } from 'zod'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { ValidationError } from '../../utils/errors'

type ValidationTarget = 'json' | 'query' | 'param' | 'header'

interface JsonResponseEntry {
  description: string
  content: { 'application/json': { schema: ResolverReturnType } }
}

/**
 * validator 包装:校验失败时抛 ValidationError,统一经 app.onError → toErrorShape
 * 收敛成 400 VALIDATION_ERROR,与历史手动 schema.parse() 的错误格式保持一致。
 * 不标注返回类型,保留 hono 对 c.req.valid() 的类型推断。
 */
export function validate<Target extends ValidationTarget, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(result.error[0]?.message ?? '请求参数不正确。', result.error)
    }
  })
}

/** 构造 describeRoute 的 application/json 响应条目。 */
export function jsonResponse(schema: ZodType, description = 'OK'): JsonResponseEntry {
  return {
    description,
    content: { 'application/json': { schema: resolver(schema) } },
  }
}

/** 仅含描述、无响应体的响应条目(如 400/401)。 */
export function emptyResponse(description: string) {
  return { description }
}

export { describeRoute, resolver }
