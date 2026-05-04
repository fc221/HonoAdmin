import { createRoute } from 'honox/factory'
import {
  loginUser,
  verifyAdminSession,
} from '../../service'
import LoginForm from './_components/_login-form'

const defaultReturnTo = '/user/profile'
const loginPath = '/user/login'
const logoutPath = '/user/logout'

export const POST = createRoute(async (c) => {
  const body = await c.req.parseBody()
  const username = getFormValue(body, 'username')
  const password = getFormValue(body, 'password')
  const returnTo = normalizeReturnTo(getFormValue(body, 'returnTo'))

  if (!await loginUser(c, {
    password,
    remember: getFormValue(body, 'remember') === 'on',
    username,
  })) {
    return redirectToLogin(returnTo, '账号或密码不正确。')
  }

  return c.redirect(returnTo, 303)
})

export default createRoute(async (c) => {
  const returnTo = normalizeReturnTo(c.req.query('returnTo'))

  if (await verifyAdminSession(c)) {
    return c.redirect(returnTo, 302)
  }

  return c.render(
    <main class="min-h-screen bg-base-200 text-base-content">
      <title>登录 - HonoAdmin</title>
      <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_500px]">
        <section class="relative hidden overflow-hidden bg-base-300 lg:flex">
          <div class="absolute inset-0 opacity-[0.08] bg-[linear-gradient(var(--color-base-content)_1px,transparent_1px),linear-gradient(90deg,var(--color-base-content)_1px,transparent_1px)] bg-size-[32px_32px]" />
          <div class="absolute right-0 top-0 h-full w-1/3 bg-primary/10" />
          <div class="absolute bottom-0 left-0 h-px w-full bg-base-content/10" />
          <div class="relative flex h-full w-full flex-col justify-between p-10 xl:p-12">
            <a href="/" class="flex w-fit items-center gap-3">
              <span class="flex h-12 w-12 items-center justify-center rounded-box bg-primary text-lg font-bold text-primary-content">
                HA
              </span>
              <span class="text-xl font-bold">HonoAdmin</span>
            </a>

            <div class="max-w-2xl">
              <div class="mb-6 inline-flex items-center gap-2 rounded-box border border-base-content/10 bg-base-100/70 px-4 py-2 text-sm text-base-content/70 backdrop-blur">
                <i class="icon-[ri--shield-check-line]" />
                <span>HonoAdmin Console</span>
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
                  HA
                </span>
                <span class="text-lg font-bold">HonoAdmin</span>
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
                error={c.req.query('error')}
                returnTo={returnTo}
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
  )
})

function redirectToLogin(returnTo: string, error: string): Response {
  const query = new URLSearchParams({
    error,
    returnTo,
  })
  return new Response(null, {
    headers: {
      Location: `${loginPath}?${query}`,
    },
    status: 303,
  })
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
