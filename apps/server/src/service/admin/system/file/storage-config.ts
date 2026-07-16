import type { FileStorageConfig } from '@hono-admin/file-storage'
import type { ServiceContext } from '../../../types'
import type { ConfigEntity } from '../config/entity'
import type { FileStorageMode } from './enum'
import { ConfigurationError } from '../../../../utils/errors'
import { fileStorageModes } from './enum'

const defaultLocalRoot = './uploads'
const defaultSignedUrlTtlSeconds = 300

export async function resolveFileStorageConfig(
  ctx: ServiceContext,
  preferredMode?: FileStorageMode,
): Promise<FileStorageConfig> {
  const configs = await listFileConfigValues(ctx)
  const configuredMode = normalizeStorageMode(
    preferredMode ?? configs.get('file_storage_driver'),
  )
  const mode = ctx.config.runtimeTarget === 'cloudflare-workers'
    && configuredMode === 'local'
    ? 's3'
    : configuredMode

  if (mode === 'local') {
    return {
      mode,
      root: configs.get('file_local_root')?.trim() || defaultLocalRoot,
    }
  }

  const s3Config = {
    accessKeyId: configs.get('file_s3_access_key_id')?.trim() ?? '',
    bucket: configs.get('file_s3_bucket')?.trim() ?? '',
    endpoint: configs.get('file_s3_endpoint')?.trim() ?? '',
    mode,
    publicBaseUrl: normalizePublicBaseUrl(
      configs.get('file_s3_public_base_url'),
    ),
    region: configs.get('file_s3_region')?.trim() || 'auto',
    secretAccessKey: configs.get('file_s3_secret_access_key')?.trim() ?? '',
    signedUrlTtlSeconds: normalizeSignedUrlTtl(
      configs.get('file_s3_signed_url_ttl_seconds'),
    ),
  }

  assertS3Config(s3Config)
  return s3Config
}

async function listFileConfigValues(
  ctx: ServiceContext,
): Promise<Map<string, string>> {
  const rows = await ctx.db.query<Pick<ConfigEntity, 'config_key' | 'config_value'>>(
    `
      SELECT config_key, config_value
      FROM sys_config
      WHERE config_type = 'file'
        AND config_key IN (
          'file_storage_driver',
          'file_local_root',
          'file_s3_endpoint',
          'file_s3_region',
          'file_s3_bucket',
          'file_s3_public_base_url',
          'file_s3_access_key_id',
          'file_s3_secret_access_key',
          'file_s3_signed_url_ttl_seconds'
        )
    `,
  )

  return new Map(rows.map((row) => [row.config_key, row.config_value]))
}

function assertS3Config(
  config: Extract<FileStorageConfig, { mode: 's3' }>,
): void {
  const missing = [
    ['file_s3_endpoint', config.endpoint],
    ['file_s3_bucket', config.bucket],
    ['file_s3_access_key_id', config.accessKeyId],
    ['file_s3_secret_access_key', config.secretAccessKey],
  ].filter(([, value]) => !value)

  if (missing.length) {
    throw new ConfigurationError('S3 文件存储配置不完整。', {
      missing: missing.map(([key]) => key),
    })
  }
}

function normalizeStorageMode(value: unknown): FileStorageMode {
  return fileStorageModes.includes(value as FileStorageMode)
    ? value as FileStorageMode
    : 'local'
}

function normalizeSignedUrlTtl(value: string | undefined): number {
  const ttl = Number(value)

  if (!Number.isInteger(ttl) || ttl <= 0) {
    return defaultSignedUrlTtlSeconds
  }

  return Math.min(ttl, 604800)
}

function normalizePublicBaseUrl(value: string | undefined): string | undefined {
  const publicBaseUrl = value?.trim()
  if (!publicBaseUrl) {
    return undefined
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(publicBaseUrl)
  } catch {
    throw new ConfigurationError('S3 公共访问地址必须是有效的 URL。', {
      configKey: 'file_s3_public_base_url',
    })
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ConfigurationError('S3 公共访问地址必须使用 http 或 https。', {
      configKey: 'file_s3_public_base_url',
    })
  }

  parsedUrl.hash = ''
  parsedUrl.search = ''
  return parsedUrl.toString().replace(/\/+$/, '')
}
