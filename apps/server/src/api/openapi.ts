import { z } from 'zod'
import { createDocument } from 'zod-openapi'
import {
  configPanelPayloadSchema,
  configValuesInputSchema,
  dashboardPayloadSchema,
  installAdminInputSchema,
  installStatusSchema,
  layoutPayloadSchema,
  loginInputSchema,
  profilePasswordInputSchema,
  resourceDetailSchema,
  resourceListSchema,
  resourceMutationSchema,
  roleSwitchInputSchema,
  runtimeConfigInputSchema,
  userProfileSchema,
} from './schema'

const surfaceParamSchema = z.object({
  surface: z.enum(['admin', 'user']),
})

const activeMenuQuerySchema = z.object({
  activeMenuName: z.string().optional(),
})

const adminAreaResourceParamSchema = z.object({
  area: z.enum(['system', 'web']),
  resource: z.string(),
})

const adminAreaResourceDetailParamSchema = adminAreaResourceParamSchema.extend({
  id: z.coerce.number(),
})

const idParamSchema = z.object({
  id: z.coerce.number(),
})

const resourceQuerySchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

const healthPayloadSchema = z.object({
  app: z.string(),
  ok: z.boolean(),
  runtime: z.enum(['bun', 'cloudflare-workers']),
  timestamp: z.number(),
})

function jsonResponse<T>(schema: T, description = 'OK') {
  return {
    description,
    content: {
      'application/json': { schema },
    },
  }
}

export const openApiDocument: object = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'HonoAdmin API',
    version: '2.0.0',
  },
  paths: {
    '/api/health': {
      get: {
        responses: {
          200: jsonResponse(healthPayloadSchema, 'Health check'),
        },
        summary: 'Runtime health check',
        tags: ['system'],
      },
    },
    '/api/auth/login': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: loginInputSchema },
          },
        },
        responses: {
          200: jsonResponse(userProfileSchema, 'Authenticated user'),
          401: { description: 'Invalid credentials' },
        },
        summary: 'Login with username and password',
        tags: ['auth'],
      },
    },
    '/api/auth/logout': {
      post: {
        responses: {
          200: { description: 'Logged out' },
        },
        summary: 'Clear current session',
        tags: ['auth'],
      },
    },
    '/api/auth/session': {
      get: {
        responses: {
          200: jsonResponse(userProfileSchema.nullable(), 'Current session'),
        },
        summary: 'Read current session',
        tags: ['auth'],
      },
    },
    '/api/auth/role': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: roleSwitchInputSchema },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Role switched'),
        },
        summary: 'Switch current session role',
        tags: ['auth'],
      },
    },
    '/api/install/status': {
      get: {
        responses: {
          200: jsonResponse(installStatusSchema, 'Install status'),
        },
        summary: 'Read installation status',
        tags: ['install'],
      },
    },
    '/api/install/runtime-config': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: runtimeConfigInputSchema },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Runtime config saved'),
        },
        summary: 'Save Bun runtime configuration',
        tags: ['install'],
      },
    },
    '/api/install/migrate': {
      post: {
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Migrations applied'),
        },
        summary: 'Run pending migrations',
        tags: ['install'],
      },
    },
    '/api/install/admin': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: installAdminInputSchema },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Admin user created'),
        },
        summary: 'Create the first admin account',
        tags: ['install'],
      },
    },
    '/api/{surface}/layout': {
      get: {
        requestParams: {
          path: surfaceParamSchema,
          query: activeMenuQuerySchema,
        },
        responses: {
          200: jsonResponse(layoutPayloadSchema, 'Surface layout'),
        },
        summary: 'Read surface layout',
        tags: ['layout'],
      },
    },
    '/api/{surface}/dashboard': {
      get: {
        requestParams: {
          path: surfaceParamSchema,
        },
        responses: {
          200: jsonResponse(dashboardPayloadSchema, 'Dashboard data'),
        },
        summary: 'Read dashboard data',
        tags: ['dashboard'],
      },
    },
    '/api/user/profile/password': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: profilePasswordInputSchema },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Password updated'),
        },
        summary: 'Update current user password',
        tags: ['profile'],
      },
    },
    '/api/admin/user': {
      get: {
        requestParams: {
          query: resourceQuerySchema,
        },
        responses: {
          200: jsonResponse(resourceListSchema, 'Resource list'),
        },
        summary: 'Read admin users',
        tags: ['admin'],
      },
      post: {
        requestBody: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Admin user created'),
        },
        summary: 'Create admin user',
        tags: ['admin'],
      },
    },
    '/api/admin/user/{id}': {
      delete: {
        requestParams: {
          path: idParamSchema,
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Resource deleted'),
        },
        summary: 'Delete admin user',
        tags: ['admin'],
      },
      get: {
        requestParams: {
          path: idParamSchema,
        },
        responses: {
          200: jsonResponse(resourceDetailSchema, 'Resource detail'),
        },
        summary: 'Read admin user detail',
        tags: ['admin'],
      },
      put: {
        requestParams: {
          path: idParamSchema,
        },
        requestBody: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Resource updated'),
        },
        summary: 'Update admin user',
        tags: ['admin'],
      },
    },
    '/api/admin/system/config/panel': {
      get: {
        responses: {
          200: jsonResponse(configPanelPayloadSchema, 'Config panel data'),
        },
        summary: 'Read admin config panel',
        tags: ['admin'],
      },
    },
    '/api/admin/system/config/values': {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: configValuesInputSchema },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Config values updated'),
        },
        summary: 'Update admin config values',
        tags: ['admin'],
      },
    },
    '/api/admin/{area}/{resource}': {
      get: {
        requestParams: {
          path: adminAreaResourceParamSchema,
          query: resourceQuerySchema,
        },
        responses: {
          200: jsonResponse(resourceListSchema, 'Resource list'),
        },
        summary: 'Read admin feature list',
        tags: ['admin'],
      },
      post: {
        requestParams: {
          path: adminAreaResourceParamSchema,
        },
        requestBody: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Resource created'),
        },
        summary: 'Create admin feature record',
        tags: ['admin'],
      },
    },
    '/api/admin/{area}/{resource}/{id}': {
      delete: {
        requestParams: {
          path: adminAreaResourceDetailParamSchema,
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Resource deleted'),
        },
        summary: 'Delete admin feature detail',
        tags: ['admin'],
      },
      get: {
        requestParams: {
          path: adminAreaResourceDetailParamSchema,
        },
        responses: {
          200: jsonResponse(resourceDetailSchema, 'Resource detail'),
        },
        summary: 'Read admin feature detail',
        tags: ['admin'],
      },
      put: {
        requestParams: {
          path: adminAreaResourceDetailParamSchema,
        },
        requestBody: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Resource updated'),
        },
        summary: 'Update admin feature detail',
        tags: ['admin'],
      },
    },
    '/api/user/profile': {
      get: {
        requestParams: {
          query: resourceQuerySchema,
        },
        responses: {
          200: jsonResponse(resourceListSchema, 'Profile operation logs'),
        },
        summary: 'Read current user profile logs',
        tags: ['profile'],
      },
    },
    '/api/user/profile/{id}': {
      get: {
        requestParams: {
          path: idParamSchema,
        },
        responses: {
          200: jsonResponse(resourceDetailSchema, 'Profile detail'),
        },
        summary: 'Read current user profile detail',
        tags: ['profile'],
      },
      put: {
        requestParams: {
          path: idParamSchema,
        },
        requestBody: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Profile updated'),
        },
        summary: 'Update current user profile',
        tags: ['profile'],
      },
    },
    '/api/admin/system/file/upload': {
      post: {
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: z.object({
                file: z.array(z.file()).or(z.file()),
                uploadType: z.string(),
              }),
            },
          },
        },
        responses: {
          200: jsonResponse(resourceMutationSchema, 'Files uploaded'),
        },
        summary: 'Upload system files',
        tags: ['admin'],
      },
    },
  },
})
