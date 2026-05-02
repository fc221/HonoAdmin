import { useEffect, useState } from 'hono/jsx'
import { adminTokenStorageKey } from './admin-api'

export function useAdminToken() {
  const [token, setTokenState] = useState('')

  useEffect(() => {
    const storedToken = localStorage.getItem(adminTokenStorageKey)
    if (storedToken) {
      setTokenState(storedToken)
    }
  }, [])

  const setToken = (nextToken: string) => {
    setTokenState(nextToken)

    if (nextToken) {
      localStorage.setItem(adminTokenStorageKey, nextToken)
    } else {
      localStorage.removeItem(adminTokenStorageKey)
    }
  }

  return {
    setToken,
    token,
  }
}
