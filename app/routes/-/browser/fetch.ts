export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const result = await response.json().catch(() => null) as T | null
  if (!response.ok || result === null) {
    throw new Error('请求失败，请稍后重试。')
  }

  return result
}
