import type { Child } from 'hono/jsx'
import { createRoute } from 'honox/factory'
import {
  generateBootstrapSecret,
  getBunConfigPath,
  reloadBunRuntime,
  saveBunRuntimeConfig,
} from '../../infra/runtime'
import {
  createConfigSchema,
  createUser,
  createUserSchema,
  getDatabaseMigrationStatus,
  getUserCredentialByUsername,
  isAdminInstalled,
  runDatabaseMigrations,
  setAdminSession,
  siteNameConfig,
  upsertConfig,
} from '../../service'
import { ValidationError } from '../../utils'
import PageAlert from '../_components/_page-alert'
import {
  getActionErrorMessage,
  getFormValue,
  getPageAlert,
  redirectWithAlert,
} from '../_utils/form'
import InstallForm, {
  MigrationStep,
  RuntimeConfigStep,
} from './_components/_install-form'

export const POST = createRoute(async (c) => {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  if (!c.config.bootstrap.isConfigured) {
    if (intent === 'save-runtime-config') {
      return handleSaveRuntimeConfig(c, body)
    }

    return redirectWithAlert(c, '/install', {
      message: '请先完成运行时配置。',
      type: 'error',
    })
  }

  const migration = await getDatabaseMigrationStatus(c)
  if (!migration.isComplete) {
    if (intent === 'migrate') {
      try {
        await runDatabaseMigrations(c)
        return redirectWithAlert(c, '/install', {
          message: '数据库迁移已完成，请继续创建管理员账号。',
          type: 'success',
        })
      } catch (error) {
        return redirectWithAlert(c, '/install', {
          message: getActionErrorMessage(error),
          type: 'error',
        })
      }
    }

    return redirectWithAlert(c, '/install', {
      message: '请先完成数据库迁移。',
      type: 'error',
    })
  }

  if (await isAdminInstalled(c)) {
    return c.redirect('/user/profile', 303)
  }

  const password = getFormValue(body, 'password')
  const confirmPassword = getFormValue(body, 'confirmPassword')

  if (password !== confirmPassword) {
    return redirectWithAlert(c, '/install', {
      message: '两次输入的密码不一致。',
      type: 'error',
    })
  }

  try {
    await upsertConfig(
      c,
      createConfigSchema.parse({
        configKey: siteNameConfig.configKey,
        configType: siteNameConfig.configType,
        configValue: getFormValue(body, 'siteName'),
      }),
    )
    await createUser(
      c,
      createUserSchema.parse({
        isRoot: true,
        password,
        username: getFormValue(body, 'username'),
      }),
    )

    const user = await getUserCredentialByUsername(
      c,
      getFormValue(body, 'username'),
    )
    if (user) {
      await setAdminSession(c, user, true)
    }

    return c.redirect('/user/profile', 303)
  } catch (error) {
    return redirectWithAlert(c, '/install', {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})

export default createRoute(async (c) => {
  if (!c.config.bootstrap.isConfigured) {
    return renderInstallPage(c, {
      eyebrow: '运行时配置',
      lead: c.config.runtimeTarget === 'bun'
        ? '先保存服务端运行所需配置，当前进程会立即生效并继续安装。'
        : 'Worker 部署配置由 Cloudflare 管理，请先补齐绑定、变量和 secret。',
      title: '配置 HonoAdmin 运行环境',
      children: (
        <RuntimeConfigStep
          bootstrap={c.config.bootstrap}
          generatedSecret={generateBootstrapSecret()}
        />
      ),
    })
  }

  const migration = await getDatabaseMigrationStatus(c)
  if (!migration.isComplete) {
    return renderInstallPage(c, {
      eyebrow: '数据库初始化',
      lead: '先执行当前代码包含的数据库迁移，再创建第一个 root 管理员。',
      title: migration.isFreshDatabase ? '初始化数据库' : '升级数据库结构',
      children: <MigrationStep migration={migration} />,
    })
  }

  if (await isAdminInstalled(c)) {
    return c.redirect('/user/profile', 302)
  }

  return renderInstallPage(c, {
    eyebrow: '首次安装',
    lead: '创建站点基础配置和第一个 root 管理员账号。',
    title: '初始化 HonoAdmin',
    children: <InstallForm />,
  })
})

async function handleSaveRuntimeConfig(
  c: Parameters<typeof redirectWithAlert>[0],
  body: Record<string, unknown>,
): Promise<Response> {
  if (c.config.runtimeTarget !== 'bun') {
    return redirectWithAlert(c, '/install', {
      message: 'Cloudflare Workers 不支持在安装页写入部署配置。',
      type: 'error',
    })
  }

  try {
    const jwtSecret = getFormValue(body, 'jwtSecret').trim()
    if (jwtSecret.length < 16) {
      throw new ValidationError('JWT Secret 至少需要 16 个字符。', {
        field: 'jwtSecret',
      })
    }

    const runtimeConfig = {
      appTimezone: getFormValue(body, 'appTimezone'),
      cacheNamespace: getFormValue(body, 'cacheNamespace'),
      databaseUrl: getFormValue(body, 'databaseUrl'),
      jwtSecret,
    }
    const configPath = c.config.bootstrap.configPath ?? getBunConfigPath()

    await saveBunRuntimeConfig(runtimeConfig, configPath)
    await reloadBunRuntime({
      APP_TIMEZONE: runtimeConfig.appTimezone,
      CACHE_NAMESPACE: runtimeConfig.cacheNamespace,
      DATABASE_URL: runtimeConfig.databaseUrl,
      HONO_ADMIN_ENV_FILE: configPath,
      JWT_SECRET: runtimeConfig.jwtSecret,
    })

    return redirectWithAlert(c, '/install', {
      closable: false,
      message: '配置已保存并生效，请继续初始化数据库。',
      type: 'success',
    })
  } catch (error) {
    return redirectWithAlert(c, '/install', {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
}

function renderInstallPage(
  c: Parameters<typeof redirectWithAlert>[0],
  input: {
    children: Child
    eyebrow: string
    lead: string
    title: string
  },
): Response | Promise<Response> {
  return c.render(
    <main class="min-h-screen bg-base-200 text-base-content">
      <title>安装 - HonoAdmin</title>
      <div class="flex min-h-screen items-center justify-center px-4 py-10">
        <section class="w-full max-w-2xl rounded-box border border-base-300 bg-base-100 p-6 shadow-xl shadow-base-content/5 sm:p-8">
          <div class="mb-8 flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-primary">{input.eyebrow}</p>
              <h1 class="mt-2 text-3xl font-bold">{input.title}</h1>
              <p class="mt-3 text-sm leading-6 text-base-content/60">
                {input.lead}
              </p>
            </div>
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-box bg-primary text-lg font-bold text-primary-content">
              HA
            </span>
          </div>
          {getPageAlert(c) ? <div class="mb-4"><PageAlert alert={getPageAlert(c)} /></div> : null}
          {input.children}
        </section>
      </div>
    </main>,
  )
}
