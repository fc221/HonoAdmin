interface Props {
  error?: string
  returnTo: string
}

export default function LoginForm({ error, returnTo }: Props) {
  return (
    <form class="space-y-5" method="post">
      <input name="returnTo" type="hidden" value={returnTo} />

      {error
        ? (
            <div class="alert alert-error">
              <i class="icon-[ri--error-warning-line]" />
              <span>{error}</span>
            </div>
          )
        : null}

      <fieldset class="fieldset">
        <legend class="fieldset-legend">账号</legend>
        <label class="input input-bordered flex w-full items-center gap-3">
          <i class="icon-[ri--user-3-line] text-base-content/50" />
          <input
            class="grow"
            name="username"
            type="text"
            autocomplete="username"
            placeholder="admin"
            required
          />
        </label>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">密码</legend>
        <label class="input input-bordered flex w-full items-center gap-3">
          <i class="icon-[ri--lock-password-line] text-base-content/50" />
          <input
            class="grow"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入管理员密码"
            required
          />
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
      >
        <i class="icon-[ri--login-circle-line]" />
        登录系统
      </button>

      <a class="btn btn-outline w-full" href="/">
        <i class="icon-[ri--arrow-left-line]" />
        返回首页
      </a>
    </form>
  )
}
