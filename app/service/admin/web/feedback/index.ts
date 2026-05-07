import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  CreateWebFeedbackInput,
  ListWebFeedbackInput,
  UpdateWebFeedbackInput,
  WebFeedbackRecord,
} from './dto'
import type { WebFeedbackEntity } from './entity'
import { NotFoundError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import {
  buildKeywordCondition,
  buildWhereClause,
} from '../../../common/query'
import { listWebFeedbackSchema } from './dto'

const webFeedbackColumns = `
  id,
  title,
  content,
  contact,
  images,
  user_id,
  reply,
  status,
  created_at,
  updated_at
`

export async function listWebFeedbacks(
  ctx: ServiceContext,
  input: ListWebFeedbackInput = {},
): Promise<PaginatedResult<WebFeedbackRecord>> {
  const listInput = listWebFeedbackSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'title',
      'contact',
      'status',
    ]),
  ])
  const total = await countWebFeedbacks(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<WebFeedbackEntity>(`
    SELECT ${webFeedbackColumns}
    FROM web_feedback
    ${whereClause.sql}
    ORDER BY created_at DESC, id DESC
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

export async function createWebFeedback(
  ctx: ServiceContext,
  input: CreateWebFeedbackInput,
): Promise<WebFeedbackRecord> {
  const now = ctx.now()
  const feedbackId = await ctx.db.insertAndGetId(
    `
      INSERT INTO web_feedback (
        title,
        content,
        contact,
        images,
        user_id,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.title,
      input.content,
      input.contact ?? null,
      JSON.stringify(input.images),
      input.userId ?? null,
      'open',
      now,
      now,
    ],
  )

  return getWebFeedbackById(ctx, feedbackId)
}

export async function updateWebFeedback(
  ctx: ServiceContext,
  id: number,
  input: UpdateWebFeedbackInput,
): Promise<WebFeedbackRecord> {
  const current = await requireWebFeedback(ctx, id)

  await ctx.db.execute(
    `
      UPDATE web_feedback
      SET reply = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      hasField(input, 'reply') ? input.reply ?? null : current.reply,
      input.status ?? current.status,
      ctx.now(),
      id,
    ],
  )

  return getWebFeedbackById(ctx, id)
}

export async function deleteWebFeedback(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM web_feedback WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('反馈不存在。', { id })
  }
}

async function getWebFeedbackById(
  ctx: ServiceContext,
  id: number,
): Promise<WebFeedbackRecord> {
  return requireWebFeedback(ctx, id)
}

async function countWebFeedbacks(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM web_feedback
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

async function requireWebFeedback(
  ctx: ServiceContext,
  id: number,
): Promise<WebFeedbackEntity> {
  const row = await ctx.db.first<WebFeedbackEntity>(
    `
      SELECT ${webFeedbackColumns}
      FROM web_feedback
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('反馈不存在。', { id })
  }

  return row
}

function hasField<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key)
}
