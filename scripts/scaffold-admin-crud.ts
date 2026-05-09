import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

type FieldKind = 'boolean' | 'string' | 'text'

interface CrudField {
  kind: FieldKind
  name: string
  required: boolean
  unique: boolean
}

interface CrudOptions {
  dryRun: boolean
  fields: CrudField[]
  force: boolean
  name: string
  route: string
  table: string
  title: string
}

const root = process.cwd()

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const files = createCrudFiles(options)

  for (const file of files) {
    if (options.dryRun) {
      console.log(`would create ${file.path}`)
      continue
    }

    const path = join(root, file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.content, {
      flag: options.force ? 'w' : 'wx',
    })
    console.log(`created ${file.path}`)
  }

  console.log('')
  console.log('next steps:')
  console.log(`- import services directly from app/service/admin/system/${options.name}`)
  console.log('- add a migration for the new table and register it')
  console.log('- add a menu entry in app/consts/menu.ts')
  console.log('- run bun run check')
}

function parseOptions(args: string[]): CrudOptions {
  const values = new Map<string, string>()
  let dryRun = false
  let force = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--force') {
      force = true
      continue
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`)
    }

    const key = arg.slice(2)
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    values.set(key, value)
    index += 1
  }

  const name = requireOption(values, 'name')
  const title = requireOption(values, 'title')
  const route = normalizeAdminRoute(values.get('route') ?? name)
  const table = values.get('table') ?? toSnakeCase(name)
  const fields = parseFields(requireOption(values, 'fields'))

  assertIdentifier(name, 'name')
  assertSqlIdentifier(table, 'table')

  return { dryRun, fields, force, name, route, table, title }
}

function requireOption(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim()
  if (!value) {
    throw new Error(`Missing required option --${key}`)
  }
  return value
}

function parseFields(value: string): CrudField[] {
  return value.split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => {
      const [name = '', kindValue = '', ...flags] = field.split(':')
      const kind = normalizeFieldKind(kindValue)

      assertIdentifier(name, 'field name')
      return {
        kind,
        name,
        required: flags.includes('required'),
        unique: flags.includes('unique'),
      }
    })
}

function normalizeFieldKind(value: string): FieldKind {
  if (value === 'string' || value === 'text' || value === 'boolean') {
    return value
  }

  throw new Error(`Unsupported field kind: ${value}`)
}

function normalizeAdminRoute(value: string): string {
  return value.replace(/^\/+/, '').replace(/^admin\/?/, '')
}

function assertIdentifier(value: string, label: string) {
  if (!(/^[a-z][a-zA-Z0-9]*$/).test(value)) {
    throw new Error(`${label} must be camelCase, got "${value}"`)
  }
}

function assertSqlIdentifier(value: string, label: string) {
  if (!(/^[a-z][a-z0-9_]*$/).test(value)) {
    throw new Error(`${label} must be snake_case, got "${value}"`)
  }
}

function createCrudFiles(options: CrudOptions): Array<{ content: string, path: string }> {
  const routeDir = `app/routes/admin/${options.route}`
  const serviceDir = `app/service/admin/system/${options.name}`
  const componentPrefix = `_${toKebabCase(options.name)}`

  return [
    {
      path: `${serviceDir}/dto.ts`,
      content: createDto(options),
    },
    {
      path: `${serviceDir}/entity.ts`,
      content: createEntity(options),
    },
    {
      path: `${serviceDir}/index.ts`,
      content: createService(options),
    },
    {
      path: `${routeDir}/_actions.ts`,
      content: createActions(options),
    },
    {
      path: `${routeDir}/index.tsx`,
      content: createIndexRoute(options),
    },
    {
      path: `${routeDir}/add.tsx`,
      content: createAddRoute(options),
    },
    {
      path: `${routeDir}/edit.tsx`,
      content: createEditRoute(options),
    },
    {
      path: `${routeDir}/_components/${componentPrefix}-form.tsx`,
      content: createFormComponent(options),
    },
    {
      path: `${routeDir}/_components/${componentPrefix}-panel.tsx`,
      content: createPanelComponent(options),
    },
    {
      path: `${routeDir}/_components/${componentPrefix}-table.tsx`,
      content: createTableComponent(options),
    },
  ]
}

function createDto(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const fieldSchemas = options.fields
    .map((field) => `  ${field.name}: ${createZodField(field)},`)
    .join('\n')
  const recordFields = options.fields
    .map((field) => `  ${field.name}: z.${field.kind === 'boolean' ? 'boolean()' : 'string()'},`)
    .join('\n')

  return `import { z } from 'zod'
import { paginationSchema } from '../../common/pagination'

export const ${options.name}RecordSchema = z.object({
  id: z.number().int().positive(),
${recordFields}
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const create${pascal}Schema = z.object({
${fieldSchemas}
})

export const update${pascal}Schema = create${pascal}Schema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one ${options.name} field is required.' },
)

export const list${pascal}Schema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>
export type List${pascal}Input = z.input<typeof list${pascal}Schema>
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>
export type ${pascal}Record = z.infer<typeof ${options.name}RecordSchema>
`
}

function createEntity(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const fields = options.fields
    .map((field) => `  ${toSnakeCase(field.name)}: ${field.kind === 'boolean' ? 'number' : 'string'}`)
    .join('\n')

  return `export interface ${pascal}Entity {
  id: number
${fields}
  created_at: string
  updated_at: string
}
`
}

function createService(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const columns = ['id', ...options.fields.map((field) => toSnakeCase(field.name)), 'created_at', 'updated_at']
  const selectColumns = columns.map((column) => `  ${column},`).join('\n')
  const insertColumns = options.fields.map((field) => `        ${toSnakeCase(field.name)},`).join('\n')
  const insertParams = options.fields.map(() => '?').join(', ')
  const createValues = options.fields.map((field) => `      ${createDbInputValue('input', field)},`).join('\n')
  const updateSet = options.fields.map((field) => `          ${toSnakeCase(field.name)} = ?,`).join('\n')
  const updateValues = options.fields.map((field) => `      input.${field.name} ?? current.${toSnakeCase(field.name)},`).join('\n')
  const keywordColumns = options.fields
    .filter((field) => field.kind !== 'boolean')
    .map((field) => `      '${toSnakeCase(field.name)}',`)
    .join('\n')
  const recordFields = options.fields
    .map((field) => `    ${field.name}: ${createRecordValue(field)},`)
    .join('\n')

  return `import type { ServiceContext } from '../../../types'
import type { PaginatedResult } from '../../common/pagination'
import type {
  Create${pascal}Input,
  List${pascal}Input,
  ${pascal}Record,
  Update${pascal}Input,
} from './dto'
import type { ${pascal}Entity } from './entity'
import { NotFoundError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../common/pagination'
import {
  buildKeywordCondition,
  buildWhereClause,
} from '../../common/query'
import { list${pascal}Schema } from './dto'

const ${options.name}Columns = \`
${selectColumns}
\`

export async function list${pascal}s(
  ctx: ServiceContext,
  input: List${pascal}Input = {},
): Promise<PaginatedResult<${pascal}Record>> {
  const listInput = list${pascal}Schema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
${keywordColumns || '      \'CAST(id AS TEXT)\','}
    ]),
  ])
  const total = await count${pascal}s(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<${pascal}Entity>(\`
    SELECT \${${options.name}Columns}
    FROM ${options.table}
    \${whereClause.sql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  \`, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(rows.map(to${pascal}Record), total, pagination)
}

export async function create${pascal}(
  ctx: ServiceContext,
  input: Create${pascal}Input,
): Promise<${pascal}Record> {
  const now = ctx.now()
  const result = await ctx.db.execute(
    \`
      INSERT INTO ${options.table} (
${insertColumns}
        created_at,
        updated_at
      )
      VALUES (${insertParams}, ?, ?)
    \`,
    [
${createValues}
      now,
      now,
    ],
  )

  return get${pascal}ById(ctx, Number(result.lastInsertId))
}

export async function update${pascal}(
  ctx: ServiceContext,
  id: number,
  input: Update${pascal}Input,
): Promise<${pascal}Record> {
  const current = await require${pascal}(ctx, id)

  await ctx.db.execute(
    \`
      UPDATE ${options.table}
      SET
${updateSet}
          updated_at = ?
      WHERE id = ?
    \`,
    [
${updateValues}
      ctx.now(),
      id,
    ],
  )

  return get${pascal}ById(ctx, id)
}

export async function delete${pascal}(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM ${options.table} WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('${options.title}不存在。', { id })
  }
}

export async function get${pascal}ById(
  ctx: ServiceContext,
  id: number,
): Promise<${pascal}Record> {
  return to${pascal}Record(await require${pascal}(ctx, id))
}

async function count${pascal}s(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    \`
      SELECT COUNT(*) AS count
      FROM ${options.table}
      \${whereSql}
    \`,
    params,
  )

  return row?.count ?? 0
}

async function require${pascal}(
  ctx: ServiceContext,
  id: number,
): Promise<${pascal}Entity> {
  const row = await ctx.db.first<${pascal}Entity>(
    \`
      SELECT \${${options.name}Columns}
      FROM ${options.table}
      WHERE id = ?
    \`,
    [id],
  )

  if (!row) {
    throw new NotFoundError('${options.title}不存在。', { id })
  }

  return row
}

function to${pascal}Record(row: ${pascal}Entity): ${pascal}Record {
  return {
    id: row.id,
${recordFields}
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
`
}

function createActions(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const actionsFile = `app/routes/admin/${options.route}/_actions.ts`
  const serviceImport = createImportPath(
    actionsFile,
    `app/service/admin/system/${options.name}/index`,
  )
  const dtoImport = createImportPath(
    actionsFile,
    `app/service/admin/system/${options.name}/dto`,
  )
  const formValues = options.fields
    .map((field) => `      ${field.name}: ${createFormValue(field)},`)
    .join('\n')

  return `import type { Context } from 'hono'
import {
  create${pascal}Schema,
  update${pascal}Schema,
} from '${dtoImport}'
import {
  create${pascal},
  delete${pascal},
  update${pascal},
} from '${serviceImport}'
import {
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../_utils/form'

const pagePath = '/admin/${options.route}'
const createPath = \`\${pagePath}/add\`
const getEditPath = (id: number) => \`\${pagePath}/edit?id=\${id}\`

export async function handle${pascal}Action(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'delete') {
      await delete${pascal}(c, Number(getFormValue(body, 'id')))
      return respondWithActionAlert(c, pagePath, {
        message: '${options.title}已删除。',
        type: 'success',
      })
    }

    return respondWithActionAlert(c, pagePath, {
      message: '未知操作。',
      type: 'error',
    })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}

export async function handle${pascal}CreateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()

  try {
    const record = await create${pascal}(c, create${pascal}Schema.parse({
${formValues}
    }))
    return respondWithActionAlert(c, getEditPath(record.id), {
      message: '${options.title}已创建。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, createPath, error)
  }
}

export async function handle${pascal}UpdateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const id = Number(getFormValue(body, 'id'))
  const editPath = getEditPath(id)

  try {
    await update${pascal}(c, id, update${pascal}Schema.parse({
${formValues}
    }))
    return respondWithActionAlert(c, editPath, {
      message: '${options.title}已保存。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, editPath, error)
  }
}
`
}

function createIndexRoute(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const component = `${pascal}Panel`
  const routeFile = `app/routes/admin/${options.route}/index.tsx`
  const serviceImport = createImportPath(
    routeFile,
    `app/service/admin/system/${options.name}/index`,
  )
  const dtoImport = createImportPath(
    routeFile,
    `app/service/admin/system/${options.name}/dto`,
  )

  return `import { createRoute } from 'honox/factory'
import { list${pascal}Schema } from '${dtoImport}'
import { list${pascal}s } from '${serviceImport}'
import { getPageAlert } from '../../_utils/form'
import ${component} from './_components/_${toKebabCase(options.name)}-panel'
import { handle${pascal}Action } from './_actions'

export const POST = createRoute(handle${pascal}Action)

export default createRoute(async (c) => {
  const pagination = await list${pascal}s(c, list${pascal}Schema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  }))

  return c.render(
    <${component}
      alert={getPageAlert(c)}
      keyword={c.req.query('keyword') ?? ''}
      pagination={pagination}
    />,
  )
})
`
}

function createAddRoute(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)

  return `import { createRoute } from 'honox/factory'
import PageHeader from '../../_components/_page-header'
import ${pascal}Form from './_components/_${toKebabCase(options.name)}-form'
import { handle${pascal}CreateAction } from './_actions'

export const POST = createRoute(handle${pascal}CreateAction)

export default createRoute((c) => c.render(
  <section class="rounded-box border border-base-300 bg-base-100 p-4">
    <PageHeader
      description="填写${options.title}基础信息。"
      title="新增${options.title}"
      backHref="/admin/${options.route}"
    />
    <${pascal}Form mode="create" />
  </section>,
))
`
}

function createEditRoute(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const routeFile = `app/routes/admin/${options.route}/edit.tsx`
  const serviceImport = createImportPath(
    routeFile,
    `app/service/admin/system/${options.name}/index`,
  )

  return `import { createRoute } from 'honox/factory'
import { get${pascal}ById } from '${serviceImport}'
import PageHeader from '../../_components/_page-header'
import ${pascal}Form from './_components/_${toKebabCase(options.name)}-form'
import { handle${pascal}UpdateAction } from './_actions'

export const POST = createRoute(handle${pascal}UpdateAction)

export default createRoute(async (c) => {
  const record = await get${pascal}ById(c, Number(c.req.query('id')))

  return c.render(
    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <PageHeader
        description="保存${options.title}后会停留在当前编辑页。"
        title="编辑${options.title}"
        backHref="/admin/${options.route}"
      />
      <${pascal}Form mode="update" record={record} />
    </section>,
  )
})
`
}

function createFormComponent(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const componentFile = `app/routes/admin/${options.route}/_components/_${toKebabCase(options.name)}-form.tsx`
  const dtoImport = createImportPath(
    componentFile,
    `app/service/admin/system/${options.name}/dto`,
  )
  const inputs = options.fields.map(createFormField).join('\n\n')

  return `import type { ${pascal}Record } from '${dtoImport}'

interface Props {
  mode: 'create' | 'update'
  record?: ${pascal}Record
}

export default function ${pascal}Form({ mode, record }: Props) {
  const isUpdate = mode === 'update'

  return (
    <form
      class="grid gap-4 md:grid-cols-2"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="intent" type="hidden" value={mode} />
      {isUpdate && record ? <input name="id" type="hidden" value={record.id} /> : null}

${indent(inputs, 6)}

      <div class="flex justify-end gap-2 border-t border-base-300 pt-4 md:col-span-2">
        <a class="btn btn-ghost btn-sm" href="/admin/${options.route}">
          取消
        </a>
        <button class="btn btn-primary btn-sm" type="submit">
          {isUpdate ? '保存${options.title}' : '创建${options.title}'}
        </button>
      </div>
    </form>
  )
}
`
}

function createPanelComponent(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const componentFile = `app/routes/admin/${options.route}/_components/_${toKebabCase(options.name)}-panel.tsx`
  const dtoImport = createImportPath(
    componentFile,
    `app/service/admin/system/${options.name}/dto`,
  )

  return `import type { PageAlertState } from '../../../_components/_page-alert'
import type { PaginationState } from '../../_utils/pagination'
import type { ${pascal}Record } from '${dtoImport}'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import TableSearchForm from '../../../_components/_table-search-form'
import ${pascal}Table from './_${toKebabCase(options.name)}-table'

interface Props {
  alert?: PageAlertState
  keyword: string
  pagination: PaginationState<${pascal}Record>
}

export default function ${pascal}Panel({ alert, keyword, pagination }: Props) {
  return (
    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <PageAlert alert={alert} />
      <PageHeader
        actions={(
          <a class="btn btn-primary btn-sm" href="/admin/${options.route}/add">
            新增${options.title}
          </a>
        )}
        description="管理${options.title}列表。"
        title="${options.title}管理"
      />
      <div class="mb-4 flex justify-end">
        <TableSearchForm
          action="/admin/${options.route}"
          keyword={keyword}
          pageSize={pagination.pageSize}
        />
      </div>
      <${pascal}Table records={pagination.items} />
    </section>
  )
}
`
}

function createTableComponent(options: CrudOptions): string {
  const pascal = toPascalCase(options.name)
  const componentFile = `app/routes/admin/${options.route}/_components/_${toKebabCase(options.name)}-table.tsx`
  const dtoImport = createImportPath(
    componentFile,
    `app/service/admin/system/${options.name}/dto`,
  )
  const heads = options.fields.map((field) => `                <th>${field.name}</th>`).join('\n')
  const cells = options.fields.map((field) => `                  <td>{String(record.${field.name})}</td>`).join('\n')

  return `import type { ${pascal}Record } from '${dtoImport}'
import { ConfirmActionModal } from '../../_components/_crud-action-modal'

interface Props {
  records: ${pascal}Record[]
}

export default function ${pascal}Table({ records }: Props) {
  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
${heads}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.id}</td>
${cells}
              <td class="text-right">
                <a
                  class="btn btn-ghost btn-xs"
                  href={\`/admin/${options.route}/edit?id=\${record.id}\`}
                >
                  编辑
                </a>
                <ConfirmActionModal
                  id={\`${options.name}-delete-\${record.id}\`}
                  inputs={[
                    { name: 'intent', value: 'delete' },
                    { name: 'id', value: record.id },
                  ]}
                  message={\`${options.title}「\${record.id}」删除后不可恢复。\`}
                  title="删除${options.title}"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
`
}

function createImportPath(fromFile: string, toModule: string): string {
  const value = relative(dirname(fromFile), toModule).replace(/\\/g, '/')
  return value.startsWith('.') ? value : `./${value}`
}

function createZodField(field: CrudField): string {
  if (field.kind === 'boolean') {
    return 'z.boolean().default(false)'
  }

  const base = field.kind === 'text'
    ? 'z.string().trim()'
    : 'z.string().trim().max(255)'

  return field.required
    ? `${base}.min(1, '请输入${field.name}。')`
    : `${base}.nullable().optional()`
}

function createDbInputValue(source: string, field: CrudField): string {
  if (field.kind === 'boolean') {
    return `${source}.${field.name} ? 1 : 0`
  }

  return field.required
    ? `${source}.${field.name}`
    : `${source}.${field.name} ?? null`
}

function createRecordValue(field: CrudField): string {
  const rowField = `row.${toSnakeCase(field.name)}`
  return field.kind === 'boolean'
    ? `${rowField} === 1`
    : rowField
}

function createFormValue(field: CrudField): string {
  if (field.kind === 'boolean') {
    return `getFormValue(body, '${field.name}') === 'on'`
  }

  return field.required
    ? `getFormValue(body, '${field.name}')`
    : `getFormValue(body, '${field.name}') || null`
}

function createFormField(field: CrudField): string {
  if (field.kind === 'boolean') {
    return `<label class="label cursor-pointer justify-start gap-3 rounded-box border border-base-300 px-4 py-3">
  <input
    checked={record?.${field.name} ?? false}
    class="checkbox checkbox-primary"
    name="${field.name}"
    type="checkbox"
  />
  <span class="label-text">${field.name}</span>
</label>`
  }

  const element = field.kind === 'text' ? 'textarea' : 'input'
  const className = field.kind === 'text' ? 'textarea w-full' : 'input w-full'
  const valueAttribute = field.kind === 'text'
    ? `>{record?.${field.name} ?? ''}</textarea>`
    : `value={record?.${field.name} ?? ''}\n  />`

  return `<fieldset class="fieldset">
  <legend class="fieldset-legend">${field.name}</legend>
  <${element}
    class="${className}"
    name="${field.name}"
    placeholder="请输入${field.name}"
    ${field.required ? 'required' : ''}
  ${valueAttribute}
  <p class="label">${field.required ? '必填。' : '可选。'}</p>
</fieldset>`
}

function toPascalCase(value: string): string {
  const camel = toCamelCase(value)
  return `${camel[0]?.toUpperCase() ?? ''}${camel.slice(1)}`
}

function toCamelCase(value: string): string {
  return value.replace(/[-_](\w)/g, (_, char: string) => char.toUpperCase())
}

function toKebabCase(value: string): string {
  return toSnakeCase(value).replaceAll('_', '-')
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

function indent(value: string, spaces: number): string {
  const prefix = ' '.repeat(spaces)
  return value.split('\n').map((line) => `${prefix}${line}`).join('\n')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
