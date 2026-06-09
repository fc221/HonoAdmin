import type { BaseEntity } from '@hono-admin/db'
import type { FileStorageMode, FileUploadType } from './enum'

export interface FileEntity extends BaseEntity {
  file_size: number
  mime_type: string
  original_name: string
  storage_key: string
  storage_mode: FileStorageMode
  upload_type: FileUploadType
  user_id: number | null
}
