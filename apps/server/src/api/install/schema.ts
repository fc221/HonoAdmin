import { z } from 'zod'

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

export type InstallAdminInput = z.infer<typeof installAdminInputSchema>
export type InstallStatus = z.infer<typeof installStatusSchema>
export type RuntimeConfigInput = z.infer<typeof runtimeConfigInputSchema>
