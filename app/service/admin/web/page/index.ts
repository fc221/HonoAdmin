import type { PaginatedResult } from '../../../common'
import type { ServiceContext } from '../../../types'
import type {
  CreateWebPageInput,
  ListWebPageInput,
  UpdateWebPageInput,
  WebPageRecord,
} from './dto'
import type { WebPageEntity } from './entity'
import { NotFoundError, ValidationError } from '../../../../utils'
import {
  buildKeywordCondition,
  buildWhereClause,
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common'
import { listWebPageSchema } from './dto'

export * from './dto'
export * from './entity'

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
    rows,
    total,
    pagination,
  )
}

export async function createWebPage(
  ctx: ServiceContext,
  input: CreateWebPageInput,
): Promise<WebPageRecord> {
  await assertPageAliasAvailable(ctx, input.alias)

  const now = ctx.now()
  const result = await ctx.db.execute(
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
      input.title,
      input.alias,
      input.category ?? null,
      input.summary ?? null,
      input.content,
      now,
      now,
    ],
  )

  return getWebPageById(ctx, Number(result.lastInsertId))
}

export async function updateWebPage(
  ctx: ServiceContext,
  id: number,
  input: UpdateWebPageInput,
): Promise<WebPageRecord> {
  const current = await requireWebPage(ctx, id)
  const nextAlias = input.alias ?? current.alias

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
      input.title ?? current.title,
      nextAlias,
      hasField(input, 'category') ? input.category ?? null : current.category,
      hasField(input, 'summary') ? input.summary ?? null : current.summary,
      input.content ?? current.content,
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

  return row
}

export async function getWebPageById(
  ctx: ServiceContext,
  id: number,
): Promise<WebPageRecord> {
  return requireWebPage(ctx, id)
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

function hasField<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key)
}
