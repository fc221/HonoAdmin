import type { ServiceContext } from '../../../types'
import type {
  ConfigRecord,
  CreateConfigInput,
  SiteConfig,
  UpdateConfigInput,
} from './dto'
import type { ConfigEntity } from './entity'
import type { ConfigType } from './enum'
import { buildCacheKey } from '../../../../infra/cache/types'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import { bumpAdminLayoutCacheVersion } from '../../layout-cache'
import {
  builtInConfigDefinitions,
  siteDescriptionConfig,
  siteKeywordsConfig,
  siteNameConfig,
  siteSubtitleConfig,
} from './constants'
import { configRecordSchema, siteConfigSchema } from './dto'

const configCacheTtlSeconds = 300
const configListCacheKey = buildCacheKey('system', 'config', 'list')
const siteConfigCacheKey = buildCacheKey('system', 'config', 'site')
const configDefinitionOrder = new Map(
  builtInConfigDefinitions.map((definition, index) => [
    getConfigOrderKey(definition.configType, definition.configKey),
    index,
  ]),
)

interface ConfigValueCache {
  value: string | null
}

export async function listConfigs(ctx: ServiceContext): Promise<ConfigRecord[]> {
  const cached = await readConfigListCache(ctx)
  if (cached) {
    return cached
  }

  const rows = await ctx.db.query<ConfigEntity>(`
    SELECT id, config_type, config_key, config_value, created_at, updated_at
    FROM sys_config
    ORDER BY config_type ASC, config_key ASC
  `)
  const configs = rows.map(toConfigRecord).sort(compareConfigRecords)

  await writeCache(ctx, configListCacheKey, configs)
  return configs
}

export async function getConfigValue(
  ctx: ServiceContext,
  configType: ConfigType,
  configKey: string,
): Promise<string | null> {
  const cached = await readConfigValueCache(ctx, configType, configKey)
  if (cached !== undefined) {
    return cached
  }

  const row = await ctx.db.first<Pick<ConfigEntity, 'config_value'>>(
    `
      SELECT config_value
      FROM sys_config
      WHERE config_type = ? AND config_key = ?
    `,
    [configType, configKey],
  )

  const value = row?.config_value ?? null
  await writeCache(ctx, getConfigValueCacheKey(configType, configKey), { value })
  return value
}

export async function getSiteConfig(ctx: ServiceContext): Promise<SiteConfig> {
  const cached = await readSiteConfigCache(ctx)
  if (cached) {
    return cached
  }

  const configs = await listConfigs(ctx)
  const siteValues = new Map(
    configs
      .filter((config) => config.configType === 'site')
      .map((config) => [config.configKey, config.configValue]),
  )
  const siteConfig = siteConfigSchema.parse({
    description: siteValues.get(siteDescriptionConfig.configKey) ?? '',
    keywords: siteValues.get(siteKeywordsConfig.configKey) ?? '',
    subtitle: siteValues.get(siteSubtitleConfig.configKey) ?? '',
    title: siteValues.get(siteNameConfig.configKey) ?? 'HonoAdmin',
  })

  await writeCache(ctx, siteConfigCacheKey, siteConfig)
  return siteConfig
}

export async function createConfig(
  ctx: ServiceContext,
  input: CreateConfigInput,
): Promise<ConfigRecord> {
  const existing = await findConfig(ctx, input.configType, input.configKey)

  if (existing) {
    throw new ValidationError('配置项已存在。', {
      configKey: input.configKey,
      configType: input.configType,
    })
  }

  const now = ctx.now()
  const configId = await ctx.db.insertAndGetId(
    `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [input.configType, input.configKey, input.configValue, now, now],
  )

  const config = await getConfigById(ctx, configId)
  await invalidateConfigCache(ctx, input.configType, input.configKey)
  await bumpAdminLayoutCacheVersion(ctx)
  return config
}

export async function upsertConfig(
  ctx: ServiceContext,
  input: CreateConfigInput,
): Promise<ConfigRecord> {
  const existing = await findConfig(ctx, input.configType, input.configKey)

  if (!existing) {
    return createConfig(ctx, input)
  }

  return updateConfig(
    ctx,
    existing.id,
    { configValue: input.configValue },
  )
}

export async function updateConfig(
  ctx: ServiceContext,
  id: number,
  input: UpdateConfigInput,
): Promise<ConfigRecord> {
  const current = await requireConfig(ctx, id)
  const nextType = input.configType ?? current.config_type
  const nextKey = input.configKey ?? current.config_key

  if (nextType !== current.config_type || nextKey !== current.config_key) {
    const duplicate = await ctx.db.first<ConfigEntity>(
      `
        SELECT id, config_type, config_key, config_value, created_at, updated_at
        FROM sys_config
        WHERE config_type = ? AND config_key = ? AND id <> ?
      `,
      [nextType, nextKey, id],
    )

    if (duplicate) {
      throw new ValidationError('配置项已存在。', {
        configKey: nextKey,
        configType: nextType,
      })
    }
  }

  await ctx.db.execute(
    `
      UPDATE sys_config
      SET config_type = ?, config_key = ?, config_value = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      nextType,
      nextKey,
      input.configValue ?? current.config_value,
      ctx.now(),
      id,
    ],
  )

  await invalidateConfigCache(ctx, current.config_type, current.config_key)
  if (nextType !== current.config_type || nextKey !== current.config_key) {
    await invalidateConfigCache(ctx, nextType, nextKey)
  }
  await bumpAdminLayoutCacheVersion(ctx)

  return getConfigById(ctx, id)
}

export async function deleteConfig(ctx: ServiceContext, id: number): Promise<void> {
  const current = await requireConfig(ctx, id)
  const result = await ctx.db.execute('DELETE FROM sys_config WHERE id = ?', [id])

  if (result.rowsAffected === 0) {
    throw new NotFoundError('配置项不存在。', { id })
  }

  await invalidateConfigCache(ctx, current.config_type, current.config_key)
  await bumpAdminLayoutCacheVersion(ctx)
}

async function getConfigById(
  ctx: ServiceContext,
  id: number,
): Promise<ConfigRecord> {
  const row = await requireConfig(ctx, id)
  return toConfigRecord(row)
}

async function requireConfig(
  ctx: ServiceContext,
  id: number,
): Promise<ConfigEntity> {
  const row = await ctx.db.first<ConfigEntity>(
    `
      SELECT id, config_type, config_key, config_value, created_at, updated_at
      FROM sys_config
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('配置项不存在。', { id })
  }

  return row
}

async function findConfig(
  ctx: ServiceContext,
  configType: ConfigType,
  configKey: string,
): Promise<ConfigEntity | null> {
  return ctx.db.first<ConfigEntity>(
    `
      SELECT id, config_type, config_key, config_value, created_at, updated_at
      FROM sys_config
      WHERE config_type = ? AND config_key = ?
    `,
    [configType, configKey],
  )
}

function toConfigRecord(row: ConfigEntity): ConfigRecord {
  return {
    configKey: row.config_key,
    configType: row.config_type,
    configValue: row.config_value,
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  }
}

function compareConfigRecords(left: ConfigRecord, right: ConfigRecord): number {
  const leftOrder = getConfigDefinitionOrder(left)
  const rightOrder = getConfigDefinitionOrder(right)

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  return `${left.configType}:${left.configKey}`.localeCompare(
    `${right.configType}:${right.configKey}`,
  )
}

function getConfigDefinitionOrder(config: ConfigRecord): number {
  return configDefinitionOrder.get(
    getConfigOrderKey(config.configType, config.configKey),
  ) ?? Number.MAX_SAFE_INTEGER
}

function getConfigOrderKey(configType: ConfigType, configKey: string): string {
  return `${configType}:${configKey}`
}

async function readConfigListCache(
  ctx: ServiceContext,
): Promise<ConfigRecord[] | null> {
  const cached = await readCache<unknown>(ctx, configListCacheKey)
  const parsed = configRecordSchema.array().safeParse(cached)
  return parsed.success ? parsed.data : null
}

async function readConfigValueCache(
  ctx: ServiceContext,
  configType: ConfigType,
  configKey: string,
): Promise<string | null | undefined> {
  const cached = await readCache<unknown>(
    ctx,
    getConfigValueCacheKey(configType, configKey),
  )

  if (!isConfigValueCache(cached)) {
    return undefined
  }

  return cached.value
}

async function readSiteConfigCache(
  ctx: ServiceContext,
): Promise<SiteConfig | null> {
  const cached = await readCache<unknown>(ctx, siteConfigCacheKey)
  const parsed = siteConfigSchema.safeParse(cached)
  return parsed.success ? parsed.data : null
}

async function readCache<T>(
  ctx: ServiceContext,
  key: string,
): Promise<T | null> {
  try {
    return await ctx.cache.get<T>(key)
  } catch {
    return null
  }
}

async function writeCache<T>(
  ctx: ServiceContext,
  key: string,
  value: T,
): Promise<void> {
  try {
    await ctx.cache.set(key, value, { ttlSeconds: configCacheTtlSeconds })
  } catch {
    // Config data remains authoritative in SQL; cache writes are best-effort.
  }
}

async function invalidateConfigCache(
  ctx: ServiceContext,
  configType: ConfigType,
  configKey: string,
): Promise<void> {
  await Promise.all([
    deleteCache(ctx, configListCacheKey),
    deleteCache(ctx, siteConfigCacheKey),
    deleteCache(ctx, getConfigValueCacheKey(configType, configKey)),
  ])
}

async function deleteCache(ctx: ServiceContext, key: string): Promise<void> {
  try {
    await ctx.cache.delete(key)
  } catch {
    // The next cache miss will read SQL, so invalidation failure is tolerable.
  }
}

function getConfigValueCacheKey(
  configType: ConfigType,
  configKey: string,
): string {
  return buildCacheKey('system', 'config', 'value', configType, configKey)
}

function isConfigValueCache(value: unknown): value is ConfigValueCache {
  return (
    !!value
    && typeof value === 'object'
    && 'value' in value
    && (
      typeof (value as ConfigValueCache).value === 'string'
      || (value as ConfigValueCache).value === null
    )
  )
}
