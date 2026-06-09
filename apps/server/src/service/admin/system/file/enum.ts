export const fileUploadTypes = [
  'avatar',
  'notification',
  'page',
] as const

export const fileStorageModes = ['local', 's3'] as const

export type FileStorageMode = (typeof fileStorageModes)[number]
export type FileUploadType = (typeof fileUploadTypes)[number]

export const fileUploadTypeOptions: Array<{
  label: string
  value: FileUploadType
}> = [
  {
    label: '用户头像',
    value: 'avatar',
  },
  {
    label: '公告图片',
    value: 'notification',
  },
  {
    label: '页面图片',
    value: 'page',
  },
]

export const fileUploadTypeLabels: Record<FileUploadType, string> = {
  avatar: '头像',
  notification: '公告',
  page: '页面',
}

export const fileStorageModeLabels: Record<FileStorageMode, string> = {
  local: '本地存储',
  s3: 'S3 存储',
}
