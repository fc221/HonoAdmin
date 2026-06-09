import type {
  ConfigPanelPayload,
  ConfigValuesInput,
  DashboardPayload,
  InstallAdminInput,
  InstallStatus,
  LayoutPayload,
  LoginInput,
  ProfilePasswordInput,
  ResourceDetail,
  ResourceList,
  ResourceMutation,
  RuntimeConfigInput,
  UserProfile,
} from './schema'
import { z } from 'zod'
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
  runtimeConfigInputSchema,
  userProfileSchema,
} from './schema'

export interface ApiClientOptions {
  baseUrl?: string
  fetch?: typeof fetch
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async getLayout(surface: 'admin' | 'user', activeMenuName: string): Promise<LayoutPayload> {
    const params = new URLSearchParams({ activeMenuName })
    return this.request(layoutPayloadSchema, `/api/${surface}/layout?${params}`)
  }

  async getDashboard(surface: 'admin' | 'user'): Promise<DashboardPayload> {
    return this.request(dashboardPayloadSchema, `/api/${surface}/dashboard`)
  }

  async getResource(
    surface: 'admin' | 'user',
    resource: string,
    query: { keyword?: string, page?: number, pageSize?: number, uploadType?: string } = {},
  ): Promise<ResourceList> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    }
    const suffix = params.size ? `?${params}` : ''
    return this.request(resourceListSchema, `${getResourcePath(surface, resource)}${suffix}`)
  }

  async getResourceDetail(surface: 'admin' | 'user', resource: string, id: number): Promise<ResourceDetail> {
    return this.request(resourceDetailSchema, `${getResourcePath(surface, resource)}/${id}`)
  }

  async createResource(surface: 'admin' | 'user', resource: string, input: Record<string, unknown>): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, getResourcePath(surface, resource), {
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async updateResource(surface: 'admin' | 'user', resource: string, id: number, input: Record<string, unknown>): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, `${getResourcePath(surface, resource)}/${id}`, {
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    })
  }

  async deleteResource(surface: 'admin' | 'user', resource: string, id: number): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, `${getResourcePath(surface, resource)}/${id}`, {
      method: 'DELETE',
    })
  }

  async runResourceAction(surface: 'admin' | 'user', resource: string, action: string): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, `${getResourcePath(surface, resource)}/${action}`, {
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async getAdminConfigPanel(): Promise<ConfigPanelPayload> {
    return this.request(configPanelPayloadSchema, '/api/admin/system/config/panel')
  }

  async updateAdminConfigValues(input: ConfigValuesInput): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/admin/system/config/values', {
      body: JSON.stringify(configValuesInputSchema.parse(input)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async uploadSystemFiles(uploadType: string, files: File[]): Promise<ResourceMutation> {
    const body = new FormData()
    body.set('uploadType', uploadType)

    for (const file of files) {
      body.append('file', file)
    }

    return this.request(resourceMutationSchema, '/api/admin/system/file/upload', {
      body,
      method: 'POST',
    })
  }

  async updateProfilePassword(input: ProfilePasswordInput): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/user/profile/password', {
      body: JSON.stringify(profilePasswordInputSchema.parse(input)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async switchRole(roleId: number): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/auth/role', {
      body: JSON.stringify({ roleId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async login(input: LoginInput): Promise<UserProfile> {
    return this.request(userProfileSchema, '/api/auth/login', {
      body: JSON.stringify(loginInputSchema.parse(input)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async logout(): Promise<void> {
    await this.request(z.object({ ok: z.boolean() }), '/api/auth/logout', {
      method: 'POST',
    })
  }

  async session(): Promise<UserProfile | null> {
    return this.request(userProfileSchema.nullable(), '/api/auth/session')
  }

  async installStatus(): Promise<InstallStatus> {
    return this.request(installStatusSchema, '/api/install/status')
  }

  async saveRuntimeConfig(input: RuntimeConfigInput): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/install/runtime-config', {
      body: JSON.stringify(runtimeConfigInputSchema.parse(input)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  async runMigrations(): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/install/migrate', {
      method: 'POST',
    })
  }

  async installAdmin(input: InstallAdminInput): Promise<ResourceMutation> {
    return this.request(resourceMutationSchema, '/api/install/admin', {
      body: JSON.stringify(installAdminInputSchema.parse(input)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }

  private async request<T>(
    schema: z.ZodType<T>,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message = getErrorMessage(payload) ?? `Request failed with ${response.status}`
      throw new ApiClientError(message, response.status)
    }

    return schema.parse(payload)
  }
}

const resourcePaths: Record<'admin' | 'user', Record<string, string>> = {
  admin: {
    'system-config': '/api/admin/system/config',
    'system-file': '/api/admin/system/file',
    'system-operate-log': '/api/admin/system/operate-log',
    'system-role': '/api/admin/system/role',
    'system-update': '/api/admin/system/update',
    'system-user': '/api/admin/user',
    'web-feedback': '/api/admin/web/feedback',
    'web-notification': '/api/admin/web/notification',
    'web-page': '/api/admin/web/page',
  },
  user: {
    profile: '/api/user/profile',
  },
}

function getResourcePath(surface: 'admin' | 'user', resource: string): string {
  const path = resourcePaths[surface][resource]
  if (!path) {
    throw new ApiClientError(`未知资源：${resource}`, 404)
  }
  return path
}

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as {
    error?: { message?: unknown }
    message?: unknown
  }

  if (typeof payload.message === 'string') {
    return payload.message
  }

  return typeof payload.error?.message === 'string'
    ? payload.error.message
    : null
}
