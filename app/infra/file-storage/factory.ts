import type { FileStorageAdapter, FileStorageConfig } from './types'

export type {
  FileStorageAccess,
  FileStorageAdapter,
  FileStorageConfig,
  FileStorageMode,
  FileStoragePutInput,
  FileStorageReadInput,
  LocalFileStorageConfig,
  S3FileStorageConfig,
} from './types'

export async function createFileStorageAdapter(
  config: FileStorageConfig,
): Promise<FileStorageAdapter> {
  if (config.mode === 's3') {
    const { S3FileStorageAdapter } = await import('./adapter/s3')
    return new S3FileStorageAdapter(config)
  }

  if (
    typeof __APP_RUNTIME_TARGET__ === 'undefined'
    || __APP_RUNTIME_TARGET__ !== 'cloudflare-workers'
  ) {
    const { LocalFileStorageAdapter } = await import('./adapter/local')
    return new LocalFileStorageAdapter(config)
  }

  throw new Error('Local file storage is not available in Cloudflare Workers.')
}
