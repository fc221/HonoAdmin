import type { TestServiceContext } from './helpers/service-context'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { upsertConfig } from '../app/service/admin/system/config'
import {
  deleteFile,
  getFileAccess,
  getFileByStorageKey,
  listFiles,
  uploadFile,
} from '../app/service/admin/system/file'
import {
  uploadFileFormSchema,
} from '../app/service/admin/system/file/dto'
import {
  canAccessAdminPath,
  createRole,
} from '../app/service/admin/system/role'
import { createUser } from '../app/service/admin/system/user'
import { UserStatus } from '../app/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext
const pngBytes = new Uint8Array([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
])

beforeEach(async () => {
  testContext = await createTestServiceContext()
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('file service', () => {
  test('local image upload, list, access, and delete', async () => {
    const { ctx } = testContext
    const uploadRoot = await mkdtemp(join(tmpdir(), 'hono-admin-upload-'))

    try {
      await upsertConfig(ctx, {
        configKey: 'file_local_root',
        configType: 'file',
        configValue: uploadRoot,
      })

      const uploaded = await uploadFile(ctx, {
        file: new File([pngBytes], 'avatar.png', {
          type: 'image/png',
        }),
        uploadType: 'avatar',
        userId: 99,
      })

      expect(uploaded.id).toBeGreaterThan(0)
      expect(uploaded.storageMode).toBe('local')
      expect(uploaded.storageKey).toMatch(
        /^avatar\/2026\/01\/[\da-f-]+\.png$/,
      )
      expect(uploaded.url).toBe(`/uploads/${uploaded.storageKey}`)
      expect(uploaded.userId).toBe(99)

      const access = await getFileAccess(ctx, uploaded.storageKey)
      expect(access.kind).toBe('body')
      if (access.kind === 'body') {
        expect(access.contentType).toBe('image/png')
        expect(access.body.byteLength).toBe(pngBytes.byteLength)
      }

      const byKey = await getFileByStorageKey(ctx, uploaded.storageKey)
      expect(byKey.id).toBe(uploaded.id)

      const list = await listFiles(ctx, {
        keyword: 'avatar',
        uploadType: 'avatar',
      })
      expect(list.total).toBe(1)
      expect(list.items[0]?.originalName).toBe('avatar.png')

      await deleteFile(ctx, uploaded.id)
      await expect(getFileAccess(ctx, uploaded.storageKey))
        .rejects
        .toThrow('文件不存在。')
    } finally {
      await rm(uploadRoot, { force: true, recursive: true })
    }
  })

  test('rejects unsupported image files', async () => {
    const { ctx } = testContext

    await expect(uploadFile(ctx, {
      file: new File(['hello'], 'note.txt', { type: 'text/plain' }),
      uploadType: 'page',
      userId: null,
    })).rejects.toThrow('仅支持 JPG、PNG、WEBP、GIF 图片。')
  })

  test('rejects images whose declared mime type does not match content', async () => {
    const { ctx } = testContext

    await expect(uploadFile(ctx, {
      file: new File(['not a png'], 'avatar.png', { type: 'image/png' }),
      uploadType: 'avatar',
      userId: null,
    })).rejects.toThrow('图片文件内容和类型不匹配。')
  })

  test('S3 file access creates a temporary redirect URL', async () => {
    const { ctx } = testContext
    const storageKey = 'page/2026/01/page.png'

    await Promise.all([
      upsertConfig(ctx, {
        configKey: 'file_s3_endpoint',
        configType: 'file',
        configValue: 'https://s3.example.com',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_bucket',
        configType: 'file',
        configValue: 'hono-admin',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_access_key_id',
        configType: 'file',
        configValue: 'test-access-key',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_secret_access_key',
        configType: 'file',
        configValue: 'test-secret-key',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_signed_url_ttl_seconds',
        configType: 'file',
        configValue: '300',
      }),
    ])
    await ctx.db.execute(
      `
        INSERT INTO sys_file (
          upload_type,
          storage_mode,
          storage_key,
          original_name,
          mime_type,
          file_size,
          user_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'page',
        's3',
        storageKey,
        'page.png',
        'image/png',
        12,
        1,
        ctx.now(),
        ctx.now(),
      ],
    )

    const record = await getFileByStorageKey(ctx, storageKey)
    const access = await getFileAccess(ctx, storageKey)

    expect(record.url).toBe(`/uploads/${storageKey}`)
    expect(access.kind).toBe('redirect')
    if (access.kind === 'redirect') {
      const redirectUrl = new URL(access.url)
      expect(access.status).toBe(302)
      expect(access.cacheControl).toBe('no-store')
      expect(redirectUrl.pathname).toBe('/hono-admin/page/2026/01/page.png')
      expect(redirectUrl.searchParams.get('X-Amz-Expires')).toBe('300')
      expect(redirectUrl.searchParams.has('X-Amz-Signature')).toBe(true)
    }
  })

  test('S3 file access uses public base URL when configured', async () => {
    const { ctx } = testContext
    const storageKey = 'avatar/2026/05/avatar.png'

    await Promise.all([
      upsertConfig(ctx, {
        configKey: 'file_s3_endpoint',
        configType: 'file',
        configValue: 'https://s3.example.com',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_bucket',
        configType: 'file',
        configValue: 'hono-admin',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_public_base_url',
        configType: 'file',
        configValue: 'https://pub-99be8e2090184b07bfa9d15f3e238f51.r2.dev/',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_access_key_id',
        configType: 'file',
        configValue: 'test-access-key',
      }),
      upsertConfig(ctx, {
        configKey: 'file_s3_secret_access_key',
        configType: 'file',
        configValue: 'test-secret-key',
      }),
    ])
    await ctx.db.execute(
      `
        INSERT INTO sys_file (
          upload_type,
          storage_mode,
          storage_key,
          original_name,
          mime_type,
          file_size,
          user_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'avatar',
        's3',
        storageKey,
        'avatar.png',
        'image/png',
        12,
        1,
        ctx.now(),
        ctx.now(),
      ],
    )

    const access = await getFileAccess(ctx, storageKey)

    expect(access.kind).toBe('redirect')
    if (access.kind === 'redirect') {
      const redirectUrl = new URL(access.url)
      expect(access.status).toBe(302)
      expect(access.cacheControl).toBe('no-store')
      expect(redirectUrl.origin).toBe(
        'https://pub-99be8e2090184b07bfa9d15f3e238f51.r2.dev',
      )
      expect(redirectUrl.pathname).toBe('/avatar/2026/05/avatar.png')
      expect(redirectUrl.searchParams.has('X-Amz-Signature')).toBe(false)
    }
  })

  test('file upload schema and permissions are registered', async () => {
    const { ctx } = testContext
    const invalid = uploadFileFormSchema.safeParse({ uploadType: 'bad' })
    expect(invalid.success).toBe(false)

    const role = await createRole(ctx, {
      code: 'file-manager',
      description: 'File manager',
      menuNames: ['admin.system.file'],
      name: '文件管理员',
      permissionCodes: [
        'admin.system.file.view',
        'admin.system.file.upload',
      ],
    })
    const user = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      roleId: role.id,
      status: UserStatus.NORMAL,
      username: 'file.manager',
    })
    const credential = {
      id: user.id,
      isRoot: false,
      password: '',
      roleId: role.id,
      username: user.username,
    }

    expect(
      await canAccessAdminPath(ctx, credential, '/admin/system/file', 'GET'),
    ).toBe(true)
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/file',
        'POST',
        'upload',
      ),
    ).toBe(true)
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/file',
        'POST',
        'delete',
      ),
    ).toBe(false)
  })
})
