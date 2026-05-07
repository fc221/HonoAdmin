import type { RuntimeBindings, RuntimeTarget } from './types'
import { defaultTimezone } from '../../utils'

export type BootstrapConfigKey
  = | 'APP_TIMEZONE'
    | 'CACHE_NAMESPACE'
    | 'DATABASE_URL'
    | 'DB'
    | 'JWT_SECRET'

export interface BootstrapConfigRequirement {
  description: string
  isConfigured: boolean
  isSecret?: boolean
  key: BootstrapConfigKey
  label: string
  value?: string
}

export interface BootstrapConfigStatus {
  canWriteConfig: boolean
  configPath?: string
  isConfigured: boolean
  missingKeys: BootstrapConfigKey[]
  requirements: BootstrapConfigRequirement[]
  runtimeTarget: RuntimeTarget
}

export interface SaveBunRuntimeConfigInput {
  appTimezone: string
  cacheNamespace: string
  databaseUrl: string
  jwtSecret: string
}

const bunManagedKeys: BootstrapConfigKey[] = [
  'DATABASE_URL',
  'APP_TIMEZONE',
  'CACHE_NAMESPACE',
  'JWT_SECRET',
]
const nodeFsPromisesSpecifier = 'node:fs/promises'

export async function getBunBootstrapConfigStatus(
  bindings: RuntimeBindings = {},
): Promise<BootstrapConfigStatus> {
  const bunConfigPath = getBunConfigPath(bindings)
  const envFile = await readEnvFile(bunConfigPath)
  const values = envFile.values
  const requirements: BootstrapConfigRequirement[] = [
    {
      description: 'SQLite 文件路径，或 mysql://、mysql2://、postgres://、postgresql:// 数据库地址。',
      isConfigured: hasConfigValue(values.DATABASE_URL),
      key: 'DATABASE_URL',
      label: '数据库地址',
      value: values.DATABASE_URL ?? bindings.DATABASE_URL ?? './honox-admin.sqlite',
    },
    {
      description: '用于后台展示时间和运行时 now() 的时区。',
      isConfigured: hasConfigValue(values.APP_TIMEZONE),
      key: 'APP_TIMEZONE',
      label: '应用时区',
      value: values.APP_TIMEZONE ?? bindings.APP_TIMEZONE ?? defaultTimezone,
    },
    {
      description: '本地内存缓存命名空间。',
      isConfigured: hasConfigValue(values.CACHE_NAMESPACE),
      key: 'CACHE_NAMESPACE',
      label: '缓存命名空间',
      value: values.CACHE_NAMESPACE ?? bindings.CACHE_NAMESPACE ?? 'honox-admin',
    },
    {
      description: '用于服务端密钥类能力的强随机字符串。',
      isConfigured: hasSecretValue(values.JWT_SECRET),
      isSecret: true,
      key: 'JWT_SECRET',
      label: 'JWT Secret',
      value: values.JWT_SECRET ?? bindings.JWT_SECRET,
    },
  ]

  return createBootstrapStatus({
    canWriteConfig: true,
    configPath: bunConfigPath,
    requirements,
    runtimeTarget: 'bun',
  })
}

export function getCloudflareWorkersBootstrapConfigStatus(
  bindings: RuntimeBindings,
): BootstrapConfigStatus {
  const requirements: BootstrapConfigRequirement[] = [
    {
      description: 'Cloudflare D1 数据库 binding，必须命名为 DB。',
      isConfigured: !!bindings.DB,
      key: 'DB',
      label: 'D1 数据库绑定',
    },
    {
      description: 'Worker 环境变量，例如 Asia/Shanghai。',
      isConfigured: hasConfigValue(bindings.APP_TIMEZONE),
      key: 'APP_TIMEZONE',
      label: '应用时区',
      value: bindings.APP_TIMEZONE,
    },
    {
      description: 'Worker secret，用 wrangler secret put JWT_SECRET 配置。',
      isConfigured: hasSecretValue(bindings.JWT_SECRET),
      isSecret: true,
      key: 'JWT_SECRET',
      label: 'JWT Secret',
      value: bindings.JWT_SECRET,
    },
  ]

  return createBootstrapStatus({
    canWriteConfig: false,
    requirements,
    runtimeTarget: 'cloudflare-workers',
  })
}

export async function saveBunRuntimeConfig(
  input: SaveBunRuntimeConfigInput,
  configPath = getBunConfigPath(),
): Promise<void> {
  const envFile = await readEnvFile(configPath)
  const nextValues: Record<BootstrapConfigKey, string | undefined> = {
    APP_TIMEZONE: input.appTimezone.trim() || defaultTimezone,
    CACHE_NAMESPACE: input.cacheNamespace.trim() || 'honox-admin',
    DATABASE_URL: input.databaseUrl.trim() || './honox-admin.sqlite',
    DB: undefined,
    JWT_SECRET: input.jwtSecret.trim(),
  }
  const lines = envFile.content ? envFile.content.split(/\r?\n/) : []
  const seenKeys = new Set<BootstrapConfigKey>()
  const nextLines = lines.map((line) => {
    const key = getEnvLineKey(line)

    if (!key || !bunManagedKeys.includes(key)) {
      return line
    }

    seenKeys.add(key)
    return `${key}=${formatEnvValue(nextValues[key] ?? '')}`
  })

  for (const key of bunManagedKeys) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${formatEnvValue(nextValues[key] ?? '')}`)
    }
  }

  await writeTextFile(configPath, `${nextLines.join('\n').replace(/\n*$/, '')}\n`)
}

export function generateBootstrapSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function getBunConfigPath(bindings: RuntimeBindings = {}): string {
  const configuredPath = bindings.HONO_ADMIN_ENV_FILE?.trim()
    || process.env.HONO_ADMIN_ENV_FILE?.trim()

  if (configuredPath) {
    return configuredPath
  }

  return `${process.cwd().replace(/\/$/, '')}/.env`
}

function createBootstrapStatus(input: {
  canWriteConfig: boolean
  configPath?: string
  requirements: BootstrapConfigRequirement[]
  runtimeTarget: RuntimeTarget
}): BootstrapConfigStatus {
  const missingKeys = input.requirements
    .filter((requirement) => !requirement.isConfigured)
    .map((requirement) => requirement.key)

  return {
    canWriteConfig: input.canWriteConfig,
    configPath: input.configPath,
    isConfigured: missingKeys.length === 0,
    missingKeys,
    requirements: input.requirements,
    runtimeTarget: input.runtimeTarget,
  }
}

async function readEnvFile(configPath: string): Promise<{
  content: string
  values: Partial<Record<BootstrapConfigKey, string>>
}> {
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(configPath)

    if (!await file.exists()) {
      return { content: '', values: {} }
    }

    const content = await file.text()
    return { content, values: parseEnvValues(content) }
  }

  const { readFile } = await import(/* @vite-ignore */ nodeFsPromisesSpecifier)
  const content = await readFile(configPath, 'utf8').catch((error: unknown) => {
    if (isNodeError(error, 'ENOENT')) {
      return ''
    }

    throw error
  })
  return { content, values: parseEnvValues(content) }
}

function parseEnvValues(
  content: string,
): Partial<Record<BootstrapConfigKey, string>> {
  const values: Partial<Record<BootstrapConfigKey, string>> = {}

  for (const line of content.split(/\r?\n/)) {
    const key = getEnvLineKey(line)
    if (!key || !bunManagedKeys.includes(key)) {
      continue
    }

    const [, rawValue = ''] = line.split(/=(.*)/s)
    values[key] = parseEnvValue(rawValue)
  }

  return values
}

function getEnvLineKey(line: string): BootstrapConfigKey | null {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/)
  const key = match?.[1] as BootstrapConfigKey | undefined
  return key && bunManagedKeys.includes(key) ? key : null
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function formatEnvValue(value: string): string {
  return JSON.stringify(value)
}

function hasConfigValue(value: string | undefined): boolean {
  return !!value?.trim()
}

function hasSecretValue(value: string | undefined): boolean {
  return (value?.trim().length ?? 0) >= 16
}

async function writeTextFile(path: string, content: string): Promise<void> {
  if (typeof Bun !== 'undefined') {
    await Bun.write(path, content)
    return
  }

  const { writeFile } = await import(/* @vite-ignore */ nodeFsPromisesSpecifier)
  await writeFile(path, content)
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === code
  )
}
