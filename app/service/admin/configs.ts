import type { DBAdapter } from '../../infra/database'
import type { ConfigEntity } from '../entity'
import type {
  ConfigRecord,
  CreateConfigInput,
  UpdateConfigInput,
} from './schemas'
import { NotFoundError, ValidationError } from '../../utils'

export async function listConfigs(db: DBAdapter): Promise<ConfigRecord[]> {
  const rows = await db.query<ConfigEntity>(`
    SELECT id, config_type, config_key, config_value, created_at, updated_at
    FROM app_configs
    ORDER BY config_type ASC, config_key ASC
  `)

  return rows.map(toConfigRecord)
}

export async function createConfig(
  db: DBAdapter,
  input: CreateConfigInput,
  now: string,
): Promise<ConfigRecord> {
  const existing = await db.first<ConfigEntity>(
    `
      SELECT id, config_type, config_key, config_value, created_at, updated_at
      FROM app_configs
      WHERE config_type = ? AND config_key = ?
    `,
    [input.configType, input.configKey],
  )

  if (existing) {
    throw new ValidationError('配置项已存在。', {
      configKey: input.configKey,
      configType: input.configType,
    })
  }

  const result = await db.execute(
    `
      INSERT INTO app_configs (
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

  return getConfigById(db, Number(result.lastInsertId))
}

export async function updateConfig(
  db: DBAdapter,
  id: number,
  input: UpdateConfigInput,
  now: string,
): Promise<ConfigRecord> {
  const current = await requireConfig(db, id)
  const nextType = input.configType ?? current.config_type
  const nextKey = input.configKey ?? current.config_key

  if (nextType !== current.config_type || nextKey !== current.config_key) {
    const duplicate = await db.first<ConfigEntity>(
      `
        SELECT id, config_type, config_key, config_value, created_at, updated_at
        FROM app_configs
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

  await db.execute(
    `
      UPDATE app_configs
      SET config_type = ?, config_key = ?, config_value = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      nextType,
      nextKey,
      input.configValue ?? current.config_value,
      now,
      id,
    ],
  )

  return getConfigById(db, id)
}

export async function deleteConfig(db: DBAdapter, id: number): Promise<void> {
  const result = await db.execute('DELETE FROM app_configs WHERE id = ?', [id])

  if (result.rowsAffected === 0) {
    throw new NotFoundError('配置项不存在。', { id })
  }
}

async function getConfigById(
  db: DBAdapter,
  id: number,
): Promise<ConfigRecord> {
  const row = await requireConfig(db, id)
  return toConfigRecord(row)
}

async function requireConfig(
  db: DBAdapter,
  id: number,
): Promise<ConfigEntity> {
  const row = await db.first<ConfigEntity>(
    `
      SELECT id, config_type, config_key, config_value, created_at, updated_at
      FROM app_configs
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('配置项不存在。', { id })
  }

  return row
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
