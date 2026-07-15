import type { UserProfile } from '../apps/server/src/api/auth/schema'
import { describe, expect, test } from 'bun:test'
import { withSurfaceActiveRole } from '../apps/server/src/api/shared/layout'

function profile(activeRoleId: number | null): UserProfile {
  return {
    activeRoleId,
    id: 1,
    roles: [
      { code: 'admin', id: 1, name: '管理员' },
      { code: 'user', id: 2, name: '用户' },
    ],
    username: 'admin',
  }
}

describe('withSurfaceActiveRole', () => {
  test('admin surface highlights an admin-side role even if the active role is user', () => {
    // 切到用户后又回到 /admin,持久化的 activeRoleId 仍是用户角色。
    expect(withSurfaceActiveRole(profile(2), 'admin')?.activeRoleId).toBe(1)
  })

  test('user surface highlights the user role even if the active role is admin', () => {
    expect(withSurfaceActiveRole(profile(1), 'user')?.activeRoleId).toBe(2)
  })

  test('keeps an active role that already matches the surface', () => {
    expect(withSurfaceActiveRole(profile(1), 'admin')?.activeRoleId).toBe(1)
    expect(withSurfaceActiveRole(profile(2), 'user')?.activeRoleId).toBe(2)
  })

  test('falls back to the surface role when there is no active role', () => {
    expect(withSurfaceActiveRole(profile(null), 'admin')?.activeRoleId).toBe(1)
    expect(withSurfaceActiveRole(profile(null), 'user')?.activeRoleId).toBe(2)
  })
})
