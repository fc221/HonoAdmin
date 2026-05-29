import CsrfField from '../../-/components/csrf-field'

interface Props {
  remember: boolean
  returnTo: string
  siteTitle: string
  username: string
}

export default function LoginForm({
  remember,
  returnTo,
  siteTitle,
  username,
}: Props) {
  return (
    <form
      class="space-y-5"
      data-action="submit->login-form#start"
      data-controller="login-form"
      data-turbo="false"
      method="post"
    >
      <CsrfField />
      <input name="returnTo" type="hidden" value={returnTo} />

      <fieldset class="fieldset relative" data-form-field="username">
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
            value={username}
          />
        </label>
        <p
          class="pointer-events-none absolute left-0 top-full mt-0.5 max-w-full truncate text-xs leading-none"
          data-validation-label="true"
        />
      </fieldset>

      <fieldset class="fieldset relative" data-form-field="password">
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
        <p
          class="pointer-events-none absolute left-0 top-full mt-0.5 max-w-full truncate text-xs leading-none"
          data-validation-label="true"
        />
      </fieldset>

      <div class="flex items-center justify-between gap-4">
        <label class="label cursor-pointer gap-2">
          <input
            type="checkbox"
            name="remember"
            class="checkbox checkbox-primary checkbox-sm"
            checked={remember}
          />
          <span class="label-text">保持登录</span>
        </label>
        <a
          class="link link-hover text-sm text-primary"
          href={`mailto:admin@example.com?subject=${encodeURIComponent(`Reset ${siteTitle} password`)}`}
        >
          忘记密码？
        </a>
      </div>

      <button
        class="btn btn-primary w-full"
        data-login-form-target="button"
        type="submit"
      >
        <span
          class="loading loading-spinner loading-sm"
          data-login-form-target="spinner"
          hidden
        />
        <i
          class="icon-[ri--login-circle-line]"
          data-login-form-target="icon"
        />
        登录系统
      </button>

      <a class="btn btn-outline w-full" href="/">
        <i class="icon-[ri--arrow-left-line]" />
        返回首页
      </a>
    </form>
  )
}
