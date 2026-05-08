import { z } from 'zod'
import { paginationSchema } from '../../../common/pagination'
import { operateLogStatuses, operateLogTypes } from './enum'

export const operateLogTypeSchema = z.enum(operateLogTypes)
export const operateLogStatusSchema = z.enum(operateLogStatuses)

export const operateLogRecordSchema = z.object({
  actionKey: z.string().nullable(),
  clientIp: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
  errorMsg: z.string().nullable(),
  id: z.number().int().positive(),
  logData: z.string().nullable(),
  logMsg: z.string().nullable(),
  logType: operateLogTypeSchema.nullable(),
  method: z.string().nullable(),
  requestMethod: z.string().nullable(),
  reqData: z.string().nullable(),
  resData: z.string().nullable(),
  status: operateLogStatusSchema,
  userId: z.number().int().positive().nullable(),
})

export const createOperateLogSchema = z.object({
  actionKey: z.string().trim().max(255).nullable().optional(),
  clientIp: z.string().trim().max(255).nullable().optional(),
  errorMsg: z.string().trim().max(4000).nullable().optional(),
  logData: z.unknown().optional(),
  logMsg: z.string().trim().max(4000).nullable().optional(),
  logType: operateLogTypeSchema.nullable().optional(),
  method: z.string().trim().max(255).nullable().optional(),
  requestMethod: z.string().trim().max(20).nullable().optional(),
  reqData: z.unknown().optional(),
  resData: z.unknown().optional(),
  status: operateLogStatusSchema.default('success'),
  userId: z.number().int().positive().nullable().optional(),
})

export const listOperateLogSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
  logType: z.preprocess(
    (value) =>
      operateLogTypes.includes(value as (typeof operateLogTypes)[number])
        ? value
        : '',
    z.union([operateLogTypeSchema, z.literal('')]),
  ).default(''),
  userId: z.coerce.number().int().positive().optional(),
})

export type CreateOperateLogInput = z.input<typeof createOperateLogSchema>
export type ListOperateLogInput = z.input<typeof listOperateLogSchema>
export type OperateLogRecord = z.infer<typeof operateLogRecordSchema>
