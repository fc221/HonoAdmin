import type {
  ConfigRecord,
  UserRecord,
} from '../../../service'

export type ApiResult<T>
  = | {
    data: T
    ok: true
  }
  | {
    error: {
      code: string
      message: string
    }
    ok: false
  }

export type ConfigItem = ConfigRecord
export type UserItem = UserRecord

export const adminTokenStorageKey = 'hono-admin-api-token'

export async function requestAdminApi<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  return response.json() as Promise<ApiResult<T>>
}
