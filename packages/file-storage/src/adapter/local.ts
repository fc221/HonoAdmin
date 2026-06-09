import type {
  FileStorageAccess,
  FileStoragePutInput,
  LocalFileStorageConfig,
} from '../types'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

export class LocalFileStorageAdapter {
  readonly kind = 'local' as const

  constructor(private readonly config: LocalFileStorageConfig) {}

  async put(input: FileStoragePutInput): Promise<void> {
    const filePath = this.getSafePath(input.storageKey)

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, Buffer.from(input.body))
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.getSafePath(storageKey), { force: true })
  }

  async getAccess(input: {
    contentType: string
    storageKey: string
  }): Promise<FileStorageAccess> {
    const body = await readFile(this.getSafePath(input.storageKey))

    return {
      body: body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      ) as ArrayBuffer,
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: input.contentType,
      kind: 'body',
    }
  }

  private getSafePath(storageKey: string): string {
    const root = resolve(this.config.root)
    const filePath = resolve(root, storageKey)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`

    if (!filePath.startsWith(rootPrefix)) {
      throw new Error('Invalid local file storage key.')
    }

    return filePath
  }
}
