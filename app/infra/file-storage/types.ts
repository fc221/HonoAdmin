export type FileStorageMode = 'local' | 's3'

export interface FileStoragePutInput {
  body: ArrayBuffer
  contentType: string
  storageKey: string
}

export interface FileStorageReadInput {
  contentType: string
  storageKey: string
}

export type FileStorageAccess
  = | {
    body: ArrayBuffer
    cacheControl?: string
    contentType: string
    kind: 'body'
  }
  | {
    cacheControl?: string
    kind: 'redirect'
    status: 302
    url: string
  }

export interface FileStorageAdapter {
  readonly kind: FileStorageMode
  delete: (storageKey: string) => Promise<void>
  getAccess: (input: FileStorageReadInput) => Promise<FileStorageAccess>
  put: (input: FileStoragePutInput) => Promise<void>
}

export interface LocalFileStorageConfig {
  mode: 'local'
  root: string
}

export interface S3FileStorageConfig {
  accessKeyId: string
  bucket: string
  endpoint: string
  mode: 's3'
  region: string
  secretAccessKey: string
  signedUrlTtlSeconds: number
}

export type FileStorageConfig = LocalFileStorageConfig | S3FileStorageConfig
