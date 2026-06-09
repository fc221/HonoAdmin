import { z } from 'zod'

export const migrationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const migrationStatusSchema = z.object({
  appliedCount: z.number().int().nonnegative(),
  isComplete: z.boolean(),
  isFreshDatabase: z.boolean(),
  latestAppliedMigrationId: z.string().nullable(),
  latestCodeMigrationId: z.string().nullable(),
  pendingCount: z.number().int().nonnegative(),
  pendingMigrations: z.array(migrationSummarySchema),
})

export const updateStatusSchema = z.object({
  currentVersion: z.string(),
  migration: migrationStatusSchema,
})

export type UpdateStatus = z.infer<typeof updateStatusSchema>
