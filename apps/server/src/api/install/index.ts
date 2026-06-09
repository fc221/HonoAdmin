import type { AppEnv } from '@hono-admin/runtime'
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
import {
  installAdminInputSchema,
  resourceMutationSchema,
  runtimeConfigInputSchema,
} from '../schema'

const installApi = new Hono<AppEnv>()

installApi.get('/status', async (c) => {
  const migration = c.config.bootstrap.isConfigured
    ? await getDatabaseMigrationStatus(c).catch(() => null)
    : null
  const installed = migration?.isComplete
    ? await isAdminInstalled(c).catch(() => false)
    : false

  return c.json({
    bootstrap: c.config.bootstrap,
    installed,
    migration,
  })
})

installApi.post('/runtime-config', async (c) => {
  if (c.config.runtimeTarget !== 'bun') {
    return c.json({ message: 'Cloudflare Workers 不支持在安装页写入部署配置。' }, 400)
  }

  const input = runtimeConfigInputSchema.parse(await c.req.json())
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
    message: '配置已保存并生效，请继续初始化数据库。',
    ok: true,
  }))
})

installApi.post('/migrate', async (c) => {
  await runDatabaseMigrations(c)
  return c.json(resourceMutationSchema.parse({
    data: null,
    message: '数据库迁移已完成。',
    ok: true,
  }))
})

installApi.post('/admin', async (c) => {
  const input = installAdminInputSchema.parse(await c.req.json())

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
})

export default installApi
