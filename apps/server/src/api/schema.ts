import { z } from 'zod'

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    children: z.array(menuItemSchema).optional(),
    component: z.string().optional(),
    defaultOpen: z.boolean().optional(),
    href: z.string().optional(),
    icon: z.string(),
    label: z.string(),
    name: z.string(),
    routePath: z.string().optional(),
  })
)

export interface MenuItem {
  children?: MenuItem[]
  component?: string
  defaultOpen?: boolean
  href?: string
  icon: string
  label: string
  name: string
  routePath?: string
}

export const userRoleSchema = z.object({
  code: z.string(),
  id: z.number(),
  name: z.string(),
})

export const userProfileSchema = z.object({
  activeRoleId: z.number().nullable().optional(),
  avatar: z.string().nullable().optional(),
  id: z.number(),
  nickname: z.string().nullable().optional(),
  roles: z.array(userRoleSchema).default([]),
  username: z.string(),
})

export const layoutPayloadSchema = z.object({
  activeMenuName: z.string(),
  menus: z.array(menuItemSchema),
  siteTitle: z.string(),
  user: userProfileSchema.nullable(),
})

export const loginInputSchema = z.object({
  password: z.string().min(1),
  remember: z.boolean().default(false),
  username: z.string().trim().min(1),
})

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const resourceRowSchema = z.record(z.string(), z.unknown())

export const resourceColumnSchema = z.object({
  key: z.string(),
  title: z.string(),
  width: z.number().optional(),
})

export const resourceFieldOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
})

export const resourceFieldSchema = z.object({
  defaultValue: z.unknown().optional(),
  help: z.string().optional(),
  key: z.string(),
  label: z.string(),
  multiple: z.boolean().optional(),
  options: z.array(resourceFieldOptionSchema).optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  type: z.enum([
    'text',
    'password',
    'textarea',
    'select',
    'switch',
    'number',
    'richtext',
    'upload',
    'readonly',
  ]),
})

export const resourceActionSchema = z.object({
  danger: z.boolean().optional(),
  key: z.enum(['create', 'edit', 'delete', 'clear', 'upload', 'run']),
  label: z.string(),
})

export const resourceListSchema = z.object({
  actions: z.array(resourceActionSchema).default([]),
  columns: z.array(resourceColumnSchema),
  createFields: z.array(resourceFieldSchema).default([]),
  editFields: z.array(resourceFieldSchema).default([]),
  pagination: paginationSchema,
  rows: z.array(resourceRowSchema),
  rowActions: z.array(resourceActionSchema).default([]),
  title: z.string(),
})

export const resourceDetailSchema = z.object({
  data: resourceRowSchema,
  fields: z.array(resourceFieldSchema),
  title: z.string(),
})

export const resourceMutationSchema = z.object({
  data: resourceRowSchema.nullable().optional(),
  message: z.string(),
  ok: z.boolean(),
})

export const configTypeSchema = z.enum(['site', 'system', 'file'])

export const configTypeOptionSchema = z.object({
  label: z.string(),
  value: configTypeSchema,
})

export const configVisibilityRuleSchema = z.object({
  equals: z.union([z.string(), z.array(z.string())]).optional(),
  key: z.string(),
  notEquals: z.union([z.string(), z.array(z.string())]).optional(),
})

export const configDefinitionSchema = z.object({
  configKey: z.string(),
  configType: configTypeSchema,
  configValue: z.string(),
  description: z.string(),
  inputType: z.enum(['number', 'password', 'select', 'text', 'textarea']).optional(),
  label: z.string(),
  options: z.array(resourceFieldOptionSchema).optional(),
  visibleWhen: configVisibilityRuleSchema.optional(),
})

export const configRecordSchema = z.object({
  configKey: z.string(),
  configType: configTypeSchema,
  configValue: z.string(),
  createdAt: z.number().int().nonnegative(),
  id: z.number().int().positive(),
  updatedAt: z.number().int().nonnegative(),
})

export const configPanelPayloadSchema = z.object({
  configs: z.array(configRecordSchema),
  definitions: z.array(configDefinitionSchema),
  types: z.array(configTypeOptionSchema),
})

export const configValuesInputSchema = z.object({
  configType: configTypeSchema,
  values: z.record(z.string(), z.string().max(4000)),
})

export const dashboardStatSchema = z.object({
  label: z.string(),
  tone: z.enum(['default', 'primary', 'success', 'warning']).default('default'),
  value: z.string(),
})

export const dashboardPayloadSchema = z.object({
  stats: z.array(dashboardStatSchema),
  title: z.string(),
})

export const installStatusSchema = z.object({
  bootstrap: z.object({
    canWriteConfig: z.boolean(),
    configPath: z.string().optional(),
    isConfigured: z.boolean(),
    missingKeys: z.array(z.string()),
    requirements: z.array(z.object({
      description: z.string(),
      isConfigured: z.boolean(),
      isSecret: z.boolean().optional(),
      key: z.string(),
      label: z.string(),
      value: z.string().optional(),
    })),
    runtimeTarget: z.enum(['bun', 'cloudflare-workers']),
  }),
  installed: z.boolean(),
  migration: z.object({
    appliedCount: z.number(),
    isComplete: z.boolean(),
    isFreshDatabase: z.boolean(),
    latestAppliedMigrationId: z.string().nullable(),
    latestCodeMigrationId: z.string().nullable(),
    pendingCount: z.number(),
    pendingMigrations: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  }).nullable(),
})

export const runtimeConfigInputSchema = z.object({
  appTimezone: z.string().min(1),
  cacheNamespace: z.string().min(1),
  databaseUrl: z.string().min(1),
  jwtSecret: z.string().min(16),
  sessionSecret: z.string().min(16),
})

export const installAdminInputSchema = z.object({
  confirmPassword: z.string().min(1),
  password: z.string().min(6),
  siteName: z.string().trim().min(1),
  username: z.string().trim().min(3),
})

export const profilePasswordInputSchema = z.object({
  confirmPassword: z.string().min(1),
  oldPassword: z.string().min(1),
  password: z.string().min(6).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: '两次输入的新密码不一致。',
  path: ['confirmPassword'],
})

export const roleSwitchInputSchema = z.object({
  roleId: z.number().int().positive(),
})

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>
export type ConfigDefinition = z.infer<typeof configDefinitionSchema>
export type ConfigPanelPayload = z.infer<typeof configPanelPayloadSchema>
export type ConfigRecord = z.infer<typeof configRecordSchema>
export type ConfigType = z.infer<typeof configTypeSchema>
export type ConfigTypeOption = z.infer<typeof configTypeOptionSchema>
export type ConfigValuesInput = z.infer<typeof configValuesInputSchema>
export type ConfigVisibilityRule = z.infer<typeof configVisibilityRuleSchema>
export type InstallAdminInput = z.infer<typeof installAdminInputSchema>
export type InstallStatus = z.infer<typeof installStatusSchema>
export type LayoutPayload = z.infer<typeof layoutPayloadSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type ProfilePasswordInput = z.infer<typeof profilePasswordInputSchema>
export type ResourceAction = z.infer<typeof resourceActionSchema>
export type ResourceDetail = z.infer<typeof resourceDetailSchema>
export type ResourceField = z.infer<typeof resourceFieldSchema>
export type ResourceList = z.infer<typeof resourceListSchema>
export type ResourceMutation = z.infer<typeof resourceMutationSchema>
export type RoleSwitchInput = z.infer<typeof roleSwitchInputSchema>
export type RuntimeConfigInput = z.infer<typeof runtimeConfigInputSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
