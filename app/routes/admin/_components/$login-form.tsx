import { useState } from 'hono/jsx'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: Event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    window.setTimeout(() => {
      window.location.href = '/admin'
    }, 450)
  }

  return (
    <form class="space-y-5" onSubmit={handleSubmit}>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">账号</legend>
        <label class="input input-bordered flex w-full items-center gap-3">
          <i class="icon-[ri--user-3-line] text-base-content/50" />
          <input
            class="grow"
            name="account"
            type="text"
            autocomplete="username"
            placeholder="admin@example.com"
            required
          />
        </label>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">密码</legend>
        <label class="input input-bordered flex w-full items-center gap-3 pr-2">
          <i class="icon-[ri--lock-password-line] text-base-content/50" />
          <input
            class="grow"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autocomplete="current-password"
            placeholder="请输入密码"
            required
          />
          <button
            class="btn btn-ghost btn-xs btn-circle"
            type="button"
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            onClick={() => setShowPassword((value) => !value)}
          >
            <i
              class={
                showPassword
                  ? 'icon-[ri--eye-off-line]'
                  : 'icon-[ri--eye-line]'
              }
            />
          </button>
        </label>
      </fieldset>

      <div class="flex items-center justify-between gap-4">
        <label class="label cursor-pointer gap-2">
          <input
            type="checkbox"
            name="remember"
            class="checkbox checkbox-primary checkbox-sm"
          />
          <span class="label-text">保持登录</span>
        </label>
        <a
          class="link link-hover text-sm text-primary"
          href="mailto:admin@example.com?subject=Reset%20HonoAdmin%20password"
        >
          忘记密码？
        </a>
      </div>

      <button
        class="btn btn-primary w-full"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? (
              <>
                <span class="loading loading-spinner loading-sm" />
                正在登录
              </>
            )
          : (
              <>
                <i class="icon-[ri--login-circle-line]" />
                登录
              </>
            )}
      </button>

      <div class="divider text-xs text-base-content/40">或</div>

      <a class="btn btn-outline w-full" href="/">
        <i class="icon-[ri--arrow-left-line]" />
        返回首页
      </a>
    </form>
  )
}
