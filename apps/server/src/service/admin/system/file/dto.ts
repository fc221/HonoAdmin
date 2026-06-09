import { z } from 'zod'
import { paginationResultSchema, paginationSchema } from '../../../common/pagination'
import { fileStorageModes, fileUploadTypes } from './enum'

export const fileUploadTypeSchema = z.enum(fileUploadTypes)
export const fileStorageModeSchema = z.enum(fileStorageModes)

export const fileRecordSchema = z.object({
  createdAt: z.number().int().nonnegative(),
  fileSize: z.number().int().nonnegative(),
  id: z.number().int().positive(),
  mimeType: z.string(),
  originalName: z.string(),
  storageKey: z.string(),
  storageMode: fileStorageModeSchema,
  updatedAt: z.number().int().nonnegative(),
  uploadType: fileUploadTypeSchema,
  url: z.string(),
  userId: z.number().int().positive().nullable(),
})

export const listFileSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
  uploadType: z.union([fileUploadTypeSchema, z.literal('')]).default(''),
})

export const uploadFileFormSchema = z.object({
  uploadType: fileUploadTypeSchema,
})

export const fileListResultSchema = paginationResultSchema.extend({
  items: z.array(fileRecordSchema),
})

export type FileRecord = z.infer<typeof fileRecordSchema>
export type ListFileInput = z.input<typeof listFileSchema>
export type UploadFileFormInput = z.infer<typeof uploadFileFormSchema>
