import type { AppEnv } from '@hono-admin/runtime'
import type { PaginatedResult } from '../../../service/common/pagination'
import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import { userGenderOptions } from '../../../service/admin/system/user/enum'
import {
  getCurrentUserProfilePageData,
  updateCurrentUserAvatar,
  updateCurrentUserPassword,
  updateCurrentUserProfile,
} from '../../../service/user/profile'
import { ValidationError } from '../../../utils/errors'
import { profilePasswordInputSchema } from '../../schema'
import { describeRoute, jsonResponse, validate } from '../../shared/openapi'
import { listInput } from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'
import { resourceMutationSchema } from '../../shared/resource-schema'
import { getOptionalSessionUser } from '../../shared/session'

const profileResource: ResourceDefinition = {
  columns: [
    ['id', 'ID'],
    ['logType', '类型'],
    ['logMsg', '内容'],
    ['status', '状态'],
    ['createdAt', '时间'],
  ],
  editFields: profileEditFields,
  get: async (c) => (await getCurrentUserProfilePageData(c)).user as Record<string, unknown>,
  list: async (c) => {
    const sessionUser = await getOptionalSessionUser(c)

    if (!sessionUser) {
      return { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 }
    }

    return (await getCurrentUserProfilePageData(c, listInput(c))).logs as PaginatedResult<Record<string, unknown>>
  },
  rowActions: [],
  title: '个人日志',
  update: async (c, _id, input) => updateCurrentUserProfile(c, input as never) as Promise<Record<string, unknown>>,
}

const profileApi = new Hono<AppEnv>()
  .post(
    '/avatar',
    describeRoute({
      tags: ['profile'],
      summary: '上传并更新当前用户头像',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
              },
              required: ['file'],
            },
          },
        },
      },
      responses: { 200: jsonResponse(resourceMutationSchema, '头像已更新') },
    }),
    async (c) => {
      const body = await c.req.parseBody()
      const file = body.file
      if (!(file instanceof File)) {
        throw new ValidationError('请选择头像图片。', { field: 'file' })
      }

      const user = await updateCurrentUserAvatar(c, file)
      return c.json(resourceMutationSchema.parse({
        data: { avatar: user.avatar },
        message: '头像已更新。',
        ok: true,
      }))
    },
  )
  .post(
    '/password',
    describeRoute({
      tags: ['profile'],
      summary: '修改当前用户密码',
      responses: { 200: jsonResponse(resourceMutationSchema, '密码已更新') },
    }),
    validate('json', profilePasswordInputSchema),
    async (c) => {
      await updateCurrentUserPassword(c, c.req.valid('json'))
      return c.json({ message: '密码已更新。', ok: true })
    },
  )
  .route('/', buildResourceApp(profileResource, { tag: 'profile' }))

export default profileApi

function profileEditFields(): ResourceField[] {
  return [
    { key: 'username', label: '用户名', required: true, type: 'text' },
    { key: 'nickname', label: '昵称', type: 'text' },
    { key: 'gender', label: '性别', options: userGenderOptions, type: 'select' },
    { key: 'avatar', label: '头像 URL', type: 'text' },
    { key: 'bio', label: '个人简介', type: 'textarea' },
  ]
}
