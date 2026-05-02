import { createRoute } from 'honox/factory'
import LoginForm from './_components/$login-form'

export default createRoute((c) => {
  return c.render(
    <main class="min-h-screen bg-base-200 text-base-content">
      <title>登录 - HonoAdmin</title>
      <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        <section class="relative hidden overflow-hidden bg-base-300 lg:flex">
          <div class="absolute inset-0 opacity-[0.08] bg-[linear-gradient(var(--color-base-content)_1px,transparent_1px),linear-gradient(90deg,var(--color-base-content)_1px,transparent_1px)] bg-size-[32px_32px]" />
          <div class="absolute -right-40 top-0 h-full w-1/2 skew-x-[-10deg] bg-primary/10" />
          <div class="absolute bottom-0 left-0 h-32 w-full bg-base-100/20" />
          <div class="relative flex h-full w-full flex-col justify-between p-10 xl:p-14">
            <a href="/" class="flex w-fit items-center gap-3">
              <span class="flex h-12 w-12 items-center justify-center rounded-box bg-primary text-lg font-bold text-primary-content">
                HA
              </span>
              <span class="text-xl font-bold">HonoAdmin</span>
            </a>

            <div class="max-w-2xl">
              <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/70 px-4 py-2 text-sm text-base-content/70 backdrop-blur">
                <i class="icon-[ri--shield-check-line]" />
                <span>安全访问控制台</span>
              </div>
              <h1 class="text-5xl font-bold leading-tight xl:text-6xl">
                管理后台，从清爽的入口开始。
              </h1>
              <p class="mt-5 max-w-xl text-base leading-7 text-base-content/70">
                快速进入 HonoAdmin，处理数据、配置和团队协作。
              </p>
            </div>

            <div class="grid max-w-3xl grid-cols-3 gap-3">
              {[
                ['99.9%', '服务可用性'],
                ['2FA', '安全策略'],
                ['24h', '审计追踪'],
              ].map(([value, label]) => (
                <div
                  key={value}
                  class="rounded-box border border-base-content/10 bg-base-100/70 p-4 backdrop-blur"
                >
                  <div class="text-2xl font-bold">{value}</div>
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
                <h2 class="mt-2 text-3xl font-bold">登录控制台</h2>
                <p class="mt-3 text-sm leading-6 text-base-content/60">
                  使用你的管理员账号继续访问后台。
                </p>
              </div>
              <LoginForm />
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
