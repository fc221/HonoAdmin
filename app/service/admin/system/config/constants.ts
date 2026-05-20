import type { ConfigType } from './enum'

export interface ConfigTypeOption {
  label: string
  value: ConfigType
}

export interface BuiltInConfigDefinition {
  configKey: string
  configType: ConfigType
  configValue: string
  description: string
  inputType?: 'number' | 'password' | 'select' | 'text' | 'textarea'
  label: string
  options?: Array<{ label: string, value: string }>
  visibleWhen?: ConfigVisibilityRule
}

export interface ConfigVisibilityRule {
  equals?: string | string[]
  key: string
  notEquals?: string | string[]
}

export type ConfigValueMap = Record<string, string>

export const configTypeOptions: ConfigTypeOption[] = [
  {
    label: '站点配置',
    value: 'site',
  },
  {
    label: '系统配置',
    value: 'system',
  },
  {
    label: '文件配置',
    value: 'file',
  },
]

export const builtInConfigDefinitions: BuiltInConfigDefinition[] = [
  {
    configKey: 'site_name',
    configType: 'site',
    configValue: 'HonoAdmin',
    description: '浏览器标题、后台安装默认名称和站点主标题。',
    label: '站点标题',
  },
  {
    configKey: 'site_subtitle',
    configType: 'site',
    configValue: '',
    description: '站点副标题或一句话说明。',
    label: '站点副标题',
  },
  {
    configKey: 'site_keywords',
    configType: 'site',
    configValue: '',
    description: 'SEO 关键词，建议用英文逗号或中文逗号分隔。',
    label: '站点关键词',
  },
  {
    configKey: 'site_description',
    configType: 'site',
    configValue: '',
    description: '站点描述，用于页面摘要和 meta description。',
    inputType: 'textarea',
    label: '站点描述',
  },
  {
    configKey: 'maintenance_mode',
    configType: 'system',
    configValue: 'false',
    description: '是否进入维护模式。',
    label: '维护模式',
  },
  {
    configKey: 'file_storage_driver',
    configType: 'file',
    configValue: 'local',
    description: '本地开发可用 local；Worker 部署会自动使用 S3。',
    inputType: 'select',
    label: '文件存储方式',
    options: [
      { label: '本地存储', value: 'local' },
      { label: 'S3 存储', value: 's3' },
    ],
  },
  {
    configKey: 'file_local_root',
    configType: 'file',
    configValue: './uploads',
    description: '本地存储写入目录，仅 Bun 本地运行时使用。',
    label: '本地文件目录',
    visibleWhen: { equals: 'local', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_public_base_url',
    configType: 'file',
    configValue: '',
    description: '本地文件的公网访问地址，可填 https://panel.example.com 留空时使用当前站点 /uploads。',
    label: '文件公网访问地址',
    visibleWhen: { equals: 'local', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_endpoint',
    configType: 'file',
    configValue: '',
    description: 'S3 兼容服务 endpoint，例如 Cloudflare R2 endpoint。',
    label: 'S3 Endpoint',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_public_base_url',
    configType: 'file',
    configValue: '',
    description: 'S3/R2 公共访问地址，填入后 /uploads 会直接跳转到该地址下的文件路径，留空继续使用临时签名地址。',
    label: 'S3 公共访问地址',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_region',
    configType: 'file',
    configValue: 'auto',
    description: 'S3 region，Cloudflare R2 通常使用 auto。',
    label: 'S3 Region',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_bucket',
    configType: 'file',
    configValue: '',
    description: 'S3 bucket 名称。',
    label: 'S3 Bucket',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_access_key_id',
    configType: 'file',
    configValue: '',
    description: 'S3 Access Key ID，将保存在配置表中。',
    inputType: 'password',
    label: 'S3 Access Key ID',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_secret_access_key',
    configType: 'file',
    configValue: '',
    description: 'S3 Secret Access Key，将保存在配置表中。',
    inputType: 'password',
    label: 'S3 Secret Access Key',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
  {
    configKey: 'file_s3_signed_url_ttl_seconds',
    configType: 'file',
    configValue: '300',
    description: 'S3 临时访问地址有效期，默认 300 秒。',
    inputType: 'number',
    label: 'S3 临时地址有效期',
    visibleWhen: { equals: 's3', key: 'file_storage_driver' },
  },
]

export function isConfigDefinitionVisible(
  definition: BuiltInConfigDefinition | undefined,
  values: ConfigValueMap,
): boolean {
  const rule = definition?.visibleWhen
  if (!rule) {
    return true
  }

  const value = values[rule.key] ?? ''
  if (rule.equals !== undefined && !normalizeRuleValues(rule.equals).includes(value)) {
    return false
  }

  if (rule.notEquals !== undefined && normalizeRuleValues(rule.notEquals).includes(value)) {
    return false
  }

  return true
}

function normalizeRuleValues(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

export const siteNameConfig = {
  configKey: 'site_name',
  configType: 'site' as const,
}

export const siteSubtitleConfig = {
  configKey: 'site_subtitle',
  configType: 'site' as const,
}

export const siteKeywordsConfig = {
  configKey: 'site_keywords',
  configType: 'site' as const,
}

export const siteDescriptionConfig = {
  configKey: 'site_description',
  configType: 'site' as const,
}
