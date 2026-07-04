import type { AppEnv } from '@hono-admin/runtime'
import type { BootstrapConfigStatus } from '@hono-admin/runtime/bootstrap'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import { setAdminSession } from '../../service/admin/session'
import { upsertConfig } from '../../service/admin/system/config'
import { siteNameConfig } from '../../service/admin/system/config/constants'
import { createConfigSchema } from '../../service/admin/system/config/dto'
import {
  getDatabaseMigrationStatus,
  runDatabaseMigrations,
} from '../../service/admin/system/update'
import {
  createUser,
  getUserCredentialByUsername,
  isAdminInstalled,
} from '../../service/admin/system/user'
import { createUserSchema } from '../../service/admin/system/user/dto'
import { ForbiddenError } from '../../utils/errors'
import {
  installAdminInputSchema,
  installStatusSchema,
  resourceMutationSchema,
  runtimeConfigInputSchema,
} from '../schema'
import { describeRoute, emptyResponse, jsonResponse, validate } from '../shared/openapi'

const installApi = new Hono<AppEnv>()
  .get(
    '/status',
    describeRoute({
      tags: ['install'],
      summary: '读取安装状态',
      responses: { 200: jsonResponse(installStatusSchema, '安装状态') },
    }),
    async (c) => {
      const migration = c.config.bootstrap.isConfigured
        ? await getDatabaseMigrationStatus(c).catch(() => null)
        : null
      const installed = migration && !migration.isFreshDatabase
        ? await isAdminInstalled(c).catch(() => false)
        : false

      return c.json({
        bootstrap: redactBootstrapSecrets(c.config.bootstrap),
        installed,
        migration,
      })
    },
  )
  .post(
    '/runtime-config',
    describeRoute({
      tags: ['install'],
      summary: '保存 Bun 运行时配置',
      responses: {
        200: jsonResponse(resourceMutationSchema, '配置已保存'),
        400: emptyResponse('当前运行时不支持'),
      },
    }),
    requireFirstInstall,
    validate('json', runtimeConfigInputSchema),
    async (c) => {
      if (c.config.runtimeTarget !== 'bun') {
        return c.json({ message: 'Cloudflare Workers 不支持在安装页写入部署配置。' }, 400)
      }

      const input = c.req.valid('json')
      const configPath = c.config.bootstrap.configPath
      const runtimeBootstrapModule = '@hono-admin/runtime/bootstrap'
      const runtimeFactoryModule = '@hono-admin/runtime/factory'
      const { saveBunRuntimeConfig } = await import(/* @vite-ignore */ runtimeBootstrapModule)
      const { reloadBunRuntime } = await import(/* @vite-ignore */ runtimeFactoryModule)

      await saveBunRuntimeConfig(input, configPath)
      await reloadBunRuntime({
        APP_TIMEZONE: input.appTimezone,
        CACHE_NAMESPACE: input.cacheNamespace,
        DATABASE_URL: input.databaseUrl,
        HONO_ADMIN_ENV_FILE: configPath,
        JWT_SECRET: input.jwtSecret,
        SESSION_SECRET: input.sessionSecret,
      })

      return c.json(resourceMutationSchema.parse({
        data: null,
        message: '配置已保存并生效,请继续初始化数据库。',
        ok: true,
      }))
    },
  )
  .post(
    '/migrate',
    describeRoute({
      tags: ['install'],
      summary: '执行数据库迁移',
      responses: { 200: jsonResponse(resourceMutationSchema, '迁移已完成') },
    }),
    requireFirstInstall,
    async (c) => {
      await runDatabaseMigrations(c)
      return c.json(resourceMutationSchema.parse({
        data: null,
        message: '数据库迁移已完成。',
        ok: true,
      }))
    },
  )
  .post(
    '/admin',
    describeRoute({
      tags: ['install'],
      summary: '创建首个管理员账号',
      responses: {
        200: jsonResponse(resourceMutationSchema, '安装完成'),
        400: emptyResponse('两次输入的密码不一致'),
      },
    }),
    requireFirstInstall,
    validate('json', installAdminInputSchema),
    async (c) => {
      const input = c.req.valid('json')

      if (input.password !== input.confirmPassword) {
        return c.json({ message: '两次输入的密码不一致。' }, 400)
      }

      await upsertConfig(c, createConfigSchema.parse({
        configKey: siteNameConfig.configKey,
        configType: siteNameConfig.configType,
        configValue: input.siteName,
      }))
      await createUser(c, createUserSchema.parse({
        isRoot: true,
        password: input.password,
        username: input.username,
      }))

      const user = await getUserCredentialByUsername(c, input.username)
      if (user) {
        await setAdminSession(c, user, true)
      }

      return c.json(resourceMutationSchema.parse({
        data: null,
        message: '安装完成。',
        ok: true,
      }))
    },
  )

export default installApi

async function requireFirstInstall(c: Context<AppEnv>, next: Next): Promise<void> {
  if (await isAdminInstalled(c).catch(() => false)) {
    throw new ForbiddenError('系统已安装,安装入口已关闭。')
  }

  await next()
}

function redactBootstrapSecrets(bootstrap: BootstrapConfigStatus): BootstrapConfigStatus {
  return {
    ...bootstrap,
    requirements: bootstrap.requirements.map((requirement) => {
      if (!requirement.isSecret) {
        return requirement
      }

      const { value: _value, ...safeRequirement } = requirement
      return safeRequirement
    }),
  }
}
