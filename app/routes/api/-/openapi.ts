import type { Context } from 'hono'
import type {
  DescribeRouteOptions,
  GenerateSpecOptions,
  ResponsesWithResolver,
} from 'hono-openapi'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { describeRoute, resolver } from 'hono-openapi'
import { toErrorShape } from '../../../utils/errors'
import { apiErrorResponseSchema } from './schemas'

type ApiRouteOptions = Omit<DescribeRouteOptions, 'responses' | 'security'> & {
  includeAuthResponses?: boolean
  responses: ResponsesWithResolver
  security?: DescribeRouteOptions['security'] | false
}

type JsonResponseSchema = Parameters<typeof resolver>[0]

export const apiDocumentation: GenerateSpecOptions['documentation'] = {
  components: {
    securitySchemes: {
      bearerAuth: {
        bearerFormat: 'JWT',
        scheme: 'bearer',
        type: 'http',
      },
    },
  },
  info: {
    description: 'HonoAdmin API.',
    title: 'HonoAdmin API',
    version: '0.0.0',
  },
  openapi: '3.1.0',
  servers: [{ url: '/api' }],
}

const bearerAuthSecurity: NonNullable<DescribeRouteOptions['security']> = [{
  bearerAuth: [],
}]

const authResponses: ResponsesWithResolver = {
  401: jsonResponse(apiErrorResponseSchema, 'Unauthorized.'),
}

export function describeApiRoute({
  includeAuthResponses = true,
  responses,
  security = bearerAuthSecurity,
  ...spec
}: ApiRouteOptions) {
  return describeRoute({
    ...spec,
    responses: {
      ...responses,
      ...(includeAuthResponses ? authResponses : {}),
    },
    ...(security === false ? {} : { security }),
  })
}

export function jsonResponse(
  schema: JsonResponseSchema,
  description: string,
) {
  return {
    content: {
      'application/json': {
        schema: resolver(schema),
      },
    },
    description,
  }
}

export function handleApiError(error: unknown, c: Context) {
  if ('getResponse' in Object(error)) {
    return (error as { getResponse: () => Response }).getResponse()
  }

  const { body, status } = toErrorShape(error)
  return c.json(body, status as ContentfulStatusCode)
}

export async function withApiError(
  c: Context,
  handler: () => Promise<Response> | Response,
) {
  try {
    return await handler()
  } catch (error) {
    return handleApiError(error, c)
  }
}
