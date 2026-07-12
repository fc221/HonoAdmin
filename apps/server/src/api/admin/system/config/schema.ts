import { z } from 'zod'
import { configTypes } from '../../../../service/admin/system/config/enum'
import { resourceFieldOptionSchema } from '../../../shared/resource-schema'

export const configTypeSchema = z.enum(configTypes)

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

export type ConfigDefinition = z.infer<typeof configDefinitionSchema>
export type ConfigPanelPayload = z.infer<typeof configPanelPayloadSchema>
export type ConfigRecord = z.infer<typeof configRecordSchema>
export type ConfigType = z.infer<typeof configTypeSchema>
export type ConfigTypeOption = z.infer<typeof configTypeOptionSchema>
export type ConfigValuesInput = z.infer<typeof configValuesInputSchema>
export type ConfigVisibilityRule = z.infer<typeof configVisibilityRuleSchema>
