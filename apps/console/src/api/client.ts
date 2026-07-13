import type { AppType } from '@hono-admin/server/api/routes'
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
  UpdateStatus,
  UserProfile,
} from '@hono-admin/server/api/schema'
import { hc } from 'hono/client'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/** 同时兼容浏览器 Response / CF Response / hc ClientResponse 的结构化签名。 */
interface FetchLike {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  clone: () => FetchLike
}

/** hc<AppType>:类型由 server 端 AppType 推出,运行时还是普通 fetch。 */
const client = hc<AppType>('/api', { init: { credentials: 'include' } })

async function unwrap<T>(response: FetchLike): Promise<T> {
  if (!response.ok) {
    const message = (await readErrorMessage(response)) ?? `Request failed with ${response.status}`
    throw new ApiClientError(message, response.status)
  }
  return (await response.json()) as T
}

type Surface = 'admin' | 'user'
type ResourceQuery = { keyword?: string, page?: number, pageSize?: number, roleId?: number, uploadType?: string }

/** 通用 CRUD 的资源 → URL 路径映射。值是 `/api` 之后的部分。 */
const resourcePaths: Record<Surface, Record<string, string>> = {
  admin: {
    'system-config': '/admin/system/config',
    'system-cron': '/admin/system/cron',
    'system-file': '/admin/system/file',
    'system-operate-log': '/admin/system/operate-log',
    'system-role': '/admin/system/role',
    'system-update': '/admin/system/update',
    'system-user': '/admin/user',
    'web-feedback': '/admin/web/feedback',
    'web-notification': '/admin/web/notification',
    'web-page': '/admin/web/page',
  },
  user: {
    profile: '/user/profile',
  },
}

function resourceUrl(surface: Surface, resource: string, suffix = ''): string {
  const base = resourcePaths[surface][resource]
  if (!base) {
    throw new ApiClientError(`未知资源:${resource}`, 404)
  }
  return `/api${base}${suffix}`
}

function buildQueryString(query: ResourceQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = init?.body && !(init.body instanceof FormData)
    ? { 'Content-Type': 'application/json', ...init.headers }
    : init?.headers
  return unwrap<T>(await fetch(url, { ...init, credentials: 'include', headers }))
}

export const apiClient = {
  async getLayout(surface: Surface): Promise<LayoutPayload> {
    const res = surface === 'user'
      ? await client.user.layout.$get()
      : await client.admin.layout.$get()
    return unwrap<LayoutPayload>(res)
  },

  async getDashboard(surface: Surface): Promise<DashboardPayload> {
    const res = surface === 'user'
      ? await client.user.dashboard.$get()
      : await client.admin.dashboard.$get()
    return unwrap<DashboardPayload>(res)
  },

  async getResource(surface: Surface, resource: string, query: ResourceQuery = {}): Promise<ResourceList> {
    return jsonFetch<ResourceList>(resourceUrl(surface, resource) + buildQueryString(query))
  },

  async getResourceDetail(surface: Surface, resource: string, id: number): Promise<ResourceDetail> {
    return jsonFetch<ResourceDetail>(resourceUrl(surface, resource, `/${id}`))
  },

  async createResource(surface: Surface, resource: string, input: Record<string, unknown>): Promise<ResourceMutation> {
    return jsonFetch<ResourceMutation>(resourceUrl(surface, resource), {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async updateResource(surface: Surface, resource: string, id: number, input: Record<string, unknown>): Promise<ResourceMutation> {
    return jsonFetch<ResourceMutation>(resourceUrl(surface, resource, `/${id}`), {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  async deleteResource(surface: Surface, resource: string, id: number): Promise<ResourceMutation> {
    return jsonFetch<ResourceMutation>(resourceUrl(surface, resource, `/${id}`), {
      method: 'DELETE',
    })
  },

  async runResourceAction(surface: Surface, resource: string, action: string): Promise<ResourceMutation> {
    return jsonFetch<ResourceMutation>(resourceUrl(surface, resource, `/${action}`), {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  /** 针对单行的动作(如定时任务「执行」):POST /{resource}/{id}/{action}。 */
  async runResourceItemAction(surface: Surface, resource: string, id: number, action: string): Promise<ResourceMutation> {
    return jsonFetch<ResourceMutation>(resourceUrl(surface, resource, `/${id}/${action}`), {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  async getAdminConfigPanel(): Promise<ConfigPanelPayload> {
    const res = await client.admin.system.config.panel.$get()
    return unwrap<ConfigPanelPayload>(res)
  },

  async updateAdminConfigValues(input: ConfigValuesInput): Promise<ResourceMutation> {
    const res = await client.admin.system.config.values.$post({ json: input })
    return unwrap<ResourceMutation>(res)
  },

  async getUpdateStatus(): Promise<UpdateStatus> {
    const res = await client.admin.system.update.status.$get()
    return unwrap<UpdateStatus>(res)
  },

  async runUpdateMigrations(): Promise<ResourceMutation> {
    const res = await client.admin.system.update.migrate.$post()
    return unwrap<ResourceMutation>(res)
  },

  async uploadSystemFiles(uploadType: string, files: File[]): Promise<ResourceMutation> {
    const body = new FormData()
    body.set('uploadType', uploadType)
    for (const file of files) {
      body.append('file', file)
    }
    return jsonFetch<ResourceMutation>('/api/admin/system/file/upload', {
      method: 'POST',
      body,
    })
  },

  async updateProfilePassword(input: ProfilePasswordInput): Promise<ResourceMutation> {
    const res = await client.user.profile.password.$post({ json: input })
    return unwrap<ResourceMutation>(res)
  },

  async uploadProfileAvatar(file: File): Promise<ResourceMutation> {
    const body = new FormData()
    body.set('file', file)
    return jsonFetch<ResourceMutation>('/api/user/profile/avatar', {
      method: 'POST',
      body,
    })
  },

  async switchRole(roleId: number): Promise<ResourceMutation> {
    const res = await client.auth.role.$post({ json: { roleId } })
    return unwrap<ResourceMutation>(res)
  },

  async login(input: LoginInput): Promise<UserProfile> {
    const res = await client.auth.login.$post({ json: input })
    return unwrap<UserProfile>(res)
  },

  async logout(): Promise<void> {
    await client.auth.logout.$post()
  },

  async session(): Promise<UserProfile | null> {
    const res = await client.auth.session.$get()
    return unwrap<UserProfile | null>(res)
  },

  async installStatus(): Promise<InstallStatus> {
    const res = await client.install.status.$get()
    return unwrap<InstallStatus>(res)
  },

  async saveRuntimeConfig(input: RuntimeConfigInput): Promise<ResourceMutation> {
    const res = await client.install['runtime-config'].$post({ json: input })
    return unwrap<ResourceMutation>(res)
  },

  async runMigrations(): Promise<ResourceMutation> {
    const res = await client.install.migrate.$post()
    return unwrap<ResourceMutation>(res)
  },

  async installAdmin(input: InstallAdminInput): Promise<ResourceMutation> {
    const res = await client.install.admin.$post({ json: input })
    return unwrap<ResourceMutation>(res)
  },
}

async function readErrorMessage(response: FetchLike): Promise<string | null> {
  try {
    const payload = await response.clone().json() as { error?: { message?: unknown }, message?: unknown }
    if (typeof payload.message === 'string') {
      return payload.message
    }
    if (typeof payload.error?.message === 'string') {
      return payload.error.message
    }
  } catch {
    // 非 JSON 响应忽略
  }
  return null
}
