import { describe, expect, test } from 'bun:test'
import {
  createRoleSchema,
  createUserSchema,
  createWebNotificationSchema,
  createWebPageSchema,
  updateUserSchema,
} from '../app/service'

describe('service schemas', () => {
  test('web page schema returns field-level Chinese messages', () => {
    const result = createWebPageSchema.safeParse({
      alias: 'bad alias',
      content: '',
      title: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.join('.'),
      }))
      expect(issues).toContainEqual({
        message: '页面别名只能包含字母、数字、下划线、点和横线。',
        path: 'alias',
      })
      expect(issues).toContainEqual({
        message: '请输入页面内容。',
        path: 'content',
      })
      expect(issues).toContainEqual({
        message: '请输入页面标题。',
        path: 'title',
      })
    }
  })

  test('notification schema validates alias and required content', () => {
    const result = createWebNotificationSchema.safeParse({
      alias: 'bad alias',
      content: '',
      title: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issueByPath = new Map(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      )

      expect(issueByPath.get('alias')).toBe(
        '公告别名只能包含字母、数字、下划线、点和横线。',
      )
      expect(issueByPath.get('content')).toBe('请输入公告内容。')
      expect(issueByPath.get('title')).toBe('请输入公告标题。')
    }
  })

  test('user schema validates account fields', () => {
    const result = createUserSchema.safeParse({
      mail: 'not-email',
      password: '123',
      username: 'ab',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issueByPath = new Map(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      )

      expect(issueByPath.get('mail')).toBe('请输入有效邮箱。')
      expect(issueByPath.get('password')).toBe('密码至少需要 6 个字符。')
      expect(issueByPath.get('username')).toBe('用户名至少需要 3 个字符。')
    }
  })

  test('role schema validates code and permission codes', () => {
    const result = createRoleSchema.safeParse({
      code: 'bad code',
      name: 'a',
      permissionCodes: ['bad code'],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issueByPath = new Map(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      )

      expect(issueByPath.get('code')).toBe(
        '角色编码只能包含字母、数字、下划线、点和横线。',
      )
      expect(issueByPath.get('name')).toBe('角色名称至少需要 2 个字符。')
      expect(issueByPath.get('permissionCodes.0')).toBe(
        '操作权限编码格式不正确。',
      )
    }
  })

  test('empty update schema returns form-level issue', () => {
    const result = updateUserSchema.safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([])
      expect(result.error.issues[0]?.message).toBe(
        'At least one user field is required.',
      )
    }
  })
})
