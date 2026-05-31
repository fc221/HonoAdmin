import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createRoute } from 'honox/factory'
import Theme from '../-/components/layout/components/theme'
import PageAlert from '../-/components/page-alert'
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
import LoginBrandPanel from './-components/login-brand-panel'
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
    <main
      class="flex min-h-screen items-center justify-center bg-base-200 p-4 text-base-content"
      data-login-page="true"
    >
      <title>{formatPageTitle('登录', siteConfig.title)}</title>
      <PageAlert alert={getPageAlert(c)} />
      <div class="grid w-full max-w-[1100px] overflow-hidden rounded-box border border-base-content/10 bg-base-100/75 shadow-2xl shadow-base-content/10 backdrop-blur lg:grid-cols-2">
        <LoginBrandPanel siteTitle={siteConfig.title} />

        <section
          class="flex flex-col justify-center bg-base-100/70 p-8 md:p-12 lg:p-16"
          data-login-form-panel="true"
        >
          <div class="mb-8 flex items-center gap-2 lg:hidden">
            <span class="flex h-10 w-10 items-center justify-center rounded-box bg-primary text-xl text-primary-content shadow-lg shadow-primary/20">
              <i class="icon-[ri--flashlight-line]" />
            </span>
            <span class="text-xl font-bold">{siteConfig.title}</span>
          </div>

          <div class="mx-auto w-full max-w-105">
            <div class="mb-8 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="mb-2 text-2xl font-semibold">欢迎回来</h2>
                <p class="text-base-content/60">
                  请输入您的账号信息以访问管理系统
                </p>
              </div>
              <Theme
                buttonClassName="btn btn-circle btn-ghost shrink-0"
                id="login-theme-dropdown"
                placement="bottom-end"
              />
            </div>

            <LoginForm
              remember={formState?.remember ?? false}
              returnTo={returnTo}
              siteTitle={siteConfig.title}
              username={formState?.username ?? ''}
            />

            <div class="mt-10 text-center">
              <p class="text-sm text-base-content/45">
                还没有账号？&nbsp;
                <a
                  class="font-medium text-base-content transition-colors hover:text-primary"
                  href="#register"
                >
                  注册账号
                </a>
              </p>
            </div>
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
