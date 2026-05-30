import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createRoute } from 'honox/factory'
import PageAlert from '../-/components/page-alert'
import { getSiteLogoText } from '../-/utils/branding'
import { getPageAlert, setPageAlert } from '../-/utils/form'
import {
  formatPageTitle,
  getRenderableSiteConfig,
} from '../-/utils/site'
import { verifyAdminSession } from '../../service/admin/session'
import { getDatabaseMigrationStatus } from '../../service/admin/system/update'
import {
  clearRateLimit,
  consumeRateLimit,
  createRateLimitKey,
} from '../../service/security/rate-limit'
import { loginUser } from '../../service/user/login'
import { TooManyRequestsError } from '../../utils/errors'
import { getClientIp } from '../../utils/request'
import LoginForm from './-components/login-form'

const defaultReturnTo = '/user/dashboard'
const loginPath = '/user/login'
const logoutPath = '/user/logout'
const loginFormStateCookieName = 'hono_admin_login_form'
const loginFormStateMaxAgeSeconds = 60

interface LoginFormState {
  remember: boolean
  username: string
}

export const POST = createRoute(async (c) => {
  const body = await c.req.parseBody()
  const username = getFormValue(body, 'username')
  const password = getFormValue(body, 'password')
  const remember = getFormValue(body, 'remember') === 'on'
  const returnTo = normalizeReturnTo(getFormValue(body, 'returnTo'))
  const formState = { remember, username }
  const clientIp = getClientIp(c)
  const ipRateLimitKey = await createRateLimitKey('login-ip', clientIp)
  const accountRateLimitKey = await createRateLimitKey(
    'login-account',
    clientIp,
    username.trim().toLowerCase(),
  )

  try {
    await consumeRateLimit(c, {
      key: ipRateLimitKey,
      limit: c.config.security.loginRateLimitIpMax,
      windowSeconds: c.config.security.loginRateLimitWindowSeconds,
    })
    await consumeRateLimit(c, {
      key: accountRateLimitKey,
      limit: c.config.security.loginRateLimitAccountMax,
      windowSeconds: c.config.security.loginRateLimitWindowSeconds,
    })
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return redirectToLogin(c, returnTo, formState, error.message)
    }

    throw error
  }

  if (!await loginUser(c, {
    password,
    remember,
    username,
  })) {
    return redirectToLogin(c, returnTo, formState, '账号或密码不正确。')
  }

  await Promise.all([
    clearRateLimit(c, accountRateLimitKey),
    clearRateLimit(c, ipRateLimitKey),
  ])
  clearLoginFormState(c)
  return c.redirect(returnTo, 303)
})

export default createRoute(async (c) => {
  const returnTo = normalizeReturnTo(c.req.query('returnTo'))
  const [siteConfig, migration] = await Promise.all([
    getRenderableSiteConfig(c),
    getDatabaseMigrationStatus(c),
  ])

  if (migration.isComplete && await verifyAdminSession(c)) {
    return c.redirect(returnTo, 302)
  }

  const formState = getLoginFormState(c)

  return c.render(
    <main class="min-h-screen bg-base-200 text-base-content">
      <title>{formatPageTitle('登录', siteConfig.title)}</title>
      <PageAlert alert={getPageAlert(c)} />
      <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_500px]">
        <section class="relative hidden overflow-hidden bg-base-300 lg:flex">
          <div class="absolute inset-0 opacity-[0.08] bg-[linear-gradient(var(--color-base-content)_1px,transparent_1px),linear-gradient(90deg,var(--color-base-content)_1px,transparent_1px)] bg-size-[32px_32px]" />
          <div class="absolute right-0 top-0 h-full w-1/3 bg-primary/10" />
          <div class="absolute bottom-0 left-0 h-px w-full bg-base-content/10" />
          <div class="relative flex h-full w-full flex-col justify-between p-10 xl:p-12">
            <a href="/" class="flex w-fit items-center gap-3">
              <span class="flex h-12 w-12 items-center justify-center rounded-box bg-primary text-lg font-bold text-primary-content">
                {getSiteLogoText(siteConfig.title)}
              </span>
              <span class="text-xl font-bold">{siteConfig.title}</span>
            </a>

            <div class="max-w-2xl">
              <div class="mb-6 inline-flex items-center gap-2 rounded-box border border-base-content/10 bg-base-100/70 px-4 py-2 text-sm text-base-content/70 backdrop-blur">
                <i class="icon-[ri--shield-check-line]" />
                <span>{`${siteConfig.title} Console`}</span>
              </div>
              <h1 class="max-w-xl text-4xl font-bold leading-tight xl:text-5xl">
                一处入口，管理配置、用户和运行时状态。
              </h1>
              <p class="mt-5 max-w-xl text-base leading-7 text-base-content/70">
                本地开发和 Workers 部署共用同一套上下文与原生 SQL 管理能力。
              </p>
            </div>

            <div class="grid max-w-3xl grid-cols-3 gap-3 text-sm">
              {[
                ['HonoX', '服务端渲染'],
                ['SQL', '在线迁移'],
                ['Bearer', 'API 鉴权'],
              ].map(([value, label]) => (
                <div
                  key={value}
                  class="rounded-box border border-base-content/10 bg-base-100/70 p-4 backdrop-blur"
                >
                  <div class="font-bold">{value}</div>
                  <div class="mt-1 text-sm text-base-content/60">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section class="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div class="w-full max-w-md">
            <div class="mb-8 flex items-center justify-between lg:hidden">
              <a href="/" class="flex items-center gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-box bg-primary font-bold text-primary-content">
                  {getSiteLogoText(siteConfig.title)}
                </span>
                <span class="text-lg font-bold">{siteConfig.title}</span>
              </a>
              <a href="/" class="btn btn-ghost btn-circle" aria-label="返回首页">
                <i class="icon-[ri--home-line]" />
              </a>
            </div>

            <div class="rounded-box border border-base-300 bg-base-100 p-6 shadow-xl shadow-base-content/5 sm:p-8">
              <div class="mb-8">
                <p class="text-sm font-medium text-primary">欢迎回来</p>
                <h2 class="mt-2 text-3xl font-bold">登录系统</h2>
                <p class="mt-3 text-sm leading-6 text-base-content/60">
                  使用账号继续访问用户面板和已授权的后台功能。
                </p>
              </div>
              <LoginForm
                remember={formState?.remember ?? false}
                returnTo={returnTo}
                siteTitle={siteConfig.title}
                username={formState?.username ?? ''}
              />
            </div>

            <p class="mt-6 text-center text-sm text-base-content/60">
              还没有账号？
              {' '}
              <a class="link link-primary" href="mailto:admin@example.com">
                联系管理员
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>,
    { layout: false },
  )
})

function redirectToLogin(
  c: Context,
  returnTo: string,
  formState: LoginFormState,
  message: string,
): Response {
  setPageAlert(c, {
    message,
    type: 'error',
  })
  setLoginFormState(c, formState)
  const query = new URLSearchParams({
    returnTo,
  })
  return c.redirect(`${loginPath}?${query}`, 303)
}

function setLoginFormState(
  c: Context,
  state: LoginFormState,
): void {
  setCookie(c, loginFormStateCookieName, JSON.stringify({
    remember: state.remember,
    username: state.username,
  }), {
    httpOnly: true,
    maxAge: loginFormStateMaxAgeSeconds,
    path: loginPath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
}

function getLoginFormState(
  c: Context,
): LoginFormState | undefined {
  const value = getCookie(c, loginFormStateCookieName)
  clearLoginFormState(c)

  if (!value) {
    return undefined
  }

  for (const candidate of getCookieDecodeCandidates(value)) {
    try {
      const parsed = JSON.parse(candidate) as {
        remember?: unknown
        username?: unknown
      }

      return {
        remember: parsed.remember === true,
        username: typeof parsed.username === 'string' ? parsed.username : '',
      }
    } catch {
      continue
    }
  }

  return undefined
}

function clearLoginFormState(c: Context): void {
  deleteCookie(c, loginFormStateCookieName, {
    path: loginPath,
  })
}

function getCookieDecodeCandidates(value: string): string[] {
  const candidates = [value]

  try {
    const decoded = decodeURIComponent(value)
    if (decoded !== value) {
      candidates.push(decoded)
    }
  } catch {
    // Ignore malformed third-party cookie values and treat the flash state as absent.
  }

  return candidates
}

function getFormValue(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key]
  if (typeof value === 'string') {
    return value
  }

  return ''
}

function normalizeReturnTo(value: string | undefined): string {
  if (
    !value
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.startsWith(loginPath)
    || value.startsWith(logoutPath)
  ) {
    return defaultReturnTo
  }

  if (!value.startsWith('/admin') && !value.startsWith('/user')) {
    return defaultReturnTo
  }

  return value
}
