import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  CreateWebNotificationInput,
  ListWebNotificationInput,
  UpdateWebNotificationInput,
  WebNotificationRecord,
} from './dto'
import type { WebNotificationEntity } from './entity'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import {
  buildKeywordCondition,
  buildWhereClause,
} from '../../../common/query'
import { listWebNotificationSchema } from './dto'

const webNotificationColumns = `
  id,
  alias,
  title,
  content,
  is_top,
  is_important,
  created_at,
  updated_at
`

export async function listWebNotifications(
  ctx: ServiceContext,
  input: ListWebNotificationInput = {},
): Promise<PaginatedResult<WebNotificationRecord>> {
  const listInput = listWebNotificationSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'alias',
      'title',
    ]),
  ])
  const total = await countWebNotifications(
    ctx,
    whereClause.sql,
    whereClause.params,
  )
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<WebNotificationEntity>(`
    SELECT ${webNotificationColumns}
    FROM web_notification
    ${whereClause.sql}
    ORDER BY is_top DESC, created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(
    rows,
    total,
    pagination,
  )
}

export async function createWebNotification(
  ctx: ServiceContext,
  input: CreateWebNotificationInput,
): Promise<WebNotificationRecord> {
  await assertNotificationAliasAvailable(ctx, input.alias)

  const now = ctx.now()
  const notificationId = await ctx.db.insertAndGetId(
    `
      INSERT INTO web_notification (
        alias,
        title,
        content,
        is_top,
        is_important,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.alias,
      input.title,
      input.content,
      input.isTop ? 1 : 0,
      input.isImportant ? 1 : 0,
      now,
      now,
    ],
  )

  return getWebNotificationById(ctx, notificationId)
}

export async function updateWebNotification(
  ctx: ServiceContext,
  id: number,
  input: UpdateWebNotificationInput,
): Promise<WebNotificationRecord> {
  const current = await requireWebNotification(ctx, id)
  const nextAlias = input.alias ?? current.alias

  if (nextAlias !== current.alias) {
    await assertNotificationAliasAvailable(ctx, nextAlias, id)
  }

  await ctx.db.execute(
    `
      UPDATE web_notification
      SET alias = ?,
          title = ?,
          content = ?,
          is_top = ?,
          is_important = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      nextAlias,
      input.title ?? current.title,
      input.content ?? current.content,
      hasField(input, 'isTop') ? input.isTop ? 1 : 0 : current.is_top,
      hasField(input, 'isImportant')
        ? input.isImportant ? 1 : 0
        : current.is_important,
      ctx.now(),
      id,
    ],
  )

  return getWebNotificationById(ctx, id)
}

export async function deleteWebNotification(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM web_notification WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('公告不存在。', { id })
  }
}

export async function getWebNotificationByAlias(
  ctx: ServiceContext,
  alias: string,
): Promise<WebNotificationRecord> {
  const row = await ctx.db.first<WebNotificationEntity>(
    `
      SELECT ${webNotificationColumns}
      FROM web_notification
      WHERE alias = ?
    `,
    [alias],
  )

  if (!row) {
    throw new NotFoundError('公告不存在。', { alias })
  }

  return row
}

export async function getWebNotificationById(
  ctx: ServiceContext,
  id: number,
): Promise<WebNotificationRecord> {
  return requireWebNotification(ctx, id)
}

async function countWebNotifications(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM web_notification
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

async function requireWebNotification(
  ctx: ServiceContext,
  id: number,
): Promise<WebNotificationEntity> {
  const row = await ctx.db.first<WebNotificationEntity>(
    `
      SELECT ${webNotificationColumns}
      FROM web_notification
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('公告不存在。', { id })
  }

  return row
}

async function assertNotificationAliasAvailable(
  ctx: ServiceContext,
  alias: string,
  exceptId?: number,
): Promise<void> {
  const row = exceptId
    ? await ctx.db.first<{ id: number }>(
        'SELECT id FROM web_notification WHERE alias = ? AND id <> ?',
        [alias, exceptId],
      )
    : await ctx.db.first<{ id: number }>(
        'SELECT id FROM web_notification WHERE alias = ?',
        [alias],
      )

  if (row) {
    throw new ValidationError('公告别名已存在。', { alias })
  }
}

function hasField<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key)
}
