import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  CreateWebPageInput,
  ListWebPageInput,
  UpdateWebPageInput,
  WebPageRecord,
} from './dto'
import type { WebPageEntity } from './entity'
import { hasField } from '@hono-admin/utils/common'
import { sanitizeRichTextHtml } from '@hono-admin/utils/html'
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
import { createWebPageSchema, listWebPageSchema, updateWebPageSchema } from './dto'

const webPageColumns = `
  id,
  title,
  alias,
  category,
  summary,
  content,
  created_at,
  updated_at
`

export async function listWebPages(
  ctx: ServiceContext,
  input: ListWebPageInput = {},
): Promise<PaginatedResult<WebPageRecord>> {
  const listInput = listWebPageSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'title',
      'alias',
      'category',
      'summary',
    ]),
  ])
  const total = await countWebPages(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<WebPageEntity>(`
    SELECT ${webPageColumns}
    FROM web_page
    ${whereClause.sql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(
    rows.map(toWebPageRecord),
    total,
    pagination,
  )
}

export async function createWebPage(
  ctx: ServiceContext,
  input: CreateWebPageInput,
): Promise<WebPageRecord> {
  const parsedInput = createWebPageSchema.parse(input)
  await assertPageAliasAvailable(ctx, parsedInput.alias)

  const now = ctx.now()
  const content = sanitizeRichTextHtml(parsedInput.content)
  const pageId = await ctx.db.insertAndGetId(
    `
      INSERT INTO web_page (
        title,
        alias,
        category,
        summary,
        content,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      parsedInput.title,
      parsedInput.alias,
      parsedInput.category ?? null,
      parsedInput.summary ?? null,
      content,
      now,
      now,
    ],
  )

  return getWebPageById(ctx, pageId)
}

export async function updateWebPage(
  ctx: ServiceContext,
  id: number,
  input: UpdateWebPageInput,
): Promise<WebPageRecord> {
  const parsedInput = updateWebPageSchema.parse(input)
  const current = await requireWebPage(ctx, id)
  const nextAlias = parsedInput.alias ?? current.alias
  const nextContent = parsedInput.content === undefined
    ? current.content
    : sanitizeRichTextHtml(parsedInput.content)

  if (nextAlias !== current.alias) {
    await assertPageAliasAvailable(ctx, nextAlias, id)
  }

  await ctx.db.execute(
    `
      UPDATE web_page
      SET title = ?,
          alias = ?,
          category = ?,
          summary = ?,
          content = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      parsedInput.title ?? current.title,
      nextAlias,
      hasField(parsedInput, 'category') ? parsedInput.category ?? null : current.category,
      hasField(parsedInput, 'summary') ? parsedInput.summary ?? null : current.summary,
      nextContent,
      ctx.now(),
      id,
    ],
  )

  return getWebPageById(ctx, id)
}

export async function deleteWebPage(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM web_page WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('页面不存在。', { id })
  }
}

export async function getWebPageByAlias(
  ctx: ServiceContext,
  alias: string,
): Promise<WebPageRecord> {
  const row = await ctx.db.first<WebPageEntity>(
    `
      SELECT ${webPageColumns}
      FROM web_page
      WHERE alias = ?
    `,
    [alias],
  )

  if (!row) {
    throw new NotFoundError('页面不存在。', { alias })
  }

  return toWebPageRecord(row)
}

export async function getWebPageById(
  ctx: ServiceContext,
  id: number,
): Promise<WebPageRecord> {
  return toWebPageRecord(await requireWebPage(ctx, id))
}

async function countWebPages(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM web_page
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

async function requireWebPage(
  ctx: ServiceContext,
  id: number,
): Promise<WebPageEntity> {
  const row = await ctx.db.first<WebPageEntity>(
    `
      SELECT ${webPageColumns}
      FROM web_page
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('页面不存在。', { id })
  }

  return row
}

function toWebPageRecord(row: WebPageEntity): WebPageRecord {
  return {
    alias: row.alias,
    category: row.category,
    content: row.content,
    createdAt: row.created_at,
    id: row.id,
    summary: row.summary,
    title: row.title,
    updatedAt: row.updated_at,
  }
}

async function assertPageAliasAvailable(
  ctx: ServiceContext,
  alias: string,
  exceptId?: number,
): Promise<void> {
  const row = exceptId
    ? await ctx.db.first<{ id: number }>(
        'SELECT id FROM web_page WHERE alias = ? AND id <> ?',
        [alias, exceptId],
      )
    : await ctx.db.first<{ id: number }>(
        'SELECT id FROM web_page WHERE alias = ?',
        [alias],
      )

  if (row) {
    throw new ValidationError('页面别名已存在。', { alias })
  }
}
