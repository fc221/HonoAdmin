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
  const supportMailHref = `mailto:admin@example.com?subject=${encodeURIComponent(`Reset ${siteTitle} password`)}`

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

      <div class="relative" data-form-field="username">
        <label
          class="mb-2 block text-xs font-semibold tracking-wide text-base-content/60"
          for="login-username"
        >
          账号
        </label>
        <div class="relative">
          <i class="icon-[ri--mail-line] pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            class="input h-12 w-full rounded-box border-base-content/10 bg-base-200/70 px-12 text-base-content placeholder:text-base-content/35 focus:border-primary focus:outline-none"
            id="login-username"
            name="username"
            type="text"
            autocomplete="username"
            placeholder="root / name@example.com"
            required
            value={username}
          />
        </div>
        <p
          class="pointer-events-none absolute left-0 top-full mt-0.5 max-w-full truncate text-xs leading-none"
          data-validation-label="true"
        />
      </div>

      <div class="relative" data-form-field="password">
        <div class="mb-2 flex items-center justify-between gap-4">
          <label
            class="block text-xs font-semibold tracking-wide text-base-content/60"
            for="login-password"
          >
            密码
          </label>
          <a
            class="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            href={supportMailHref}
          >
            忘记密码？
          </a>
        </div>
        <div class="relative">
          <i class="icon-[ri--lock-password-line] pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            class="input h-12 w-full rounded-box border-base-content/10 bg-base-200/70 px-12 pr-12 text-base-content placeholder:text-base-content/35 focus:border-primary focus:outline-none"
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <p
          class="pointer-events-none absolute left-0 top-full mt-0.5 max-w-full truncate text-xs leading-none"
          data-validation-label="true"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="remember"
            class="checkbox checkbox-primary checkbox-sm rounded"
            checked={remember}
          />
          <span class="text-sm text-base-content/65">记住登录状态</span>
        </label>
      </div>

      <button
        class="btn btn-primary h-12 w-full rounded-box font-semibold shadow-lg shadow-primary/20 active:scale-[0.98]"
        data-login-form-target="button"
        type="submit"
      >
        <span
          class="loading loading-spinner loading-sm"
          data-login-form-target="spinner"
          hidden
        />
        <i
          class="icon-[ri--arrow-right-line]"
          data-login-form-target="icon"
        />
        立即登录
      </button>

      <div class="relative py-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-base-content/10" />
        </div>
        <div class="relative flex justify-center text-xs">
          <span
            class="bg-base-100 px-2 uppercase tracking-widest text-base-content/40"
            data-login-divider-label="true"
          >
            或者使用
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          class="btn btn-outline h-11 rounded-box border-base-content/10 bg-base-100/60 font-normal text-base-content/80 hover:border-primary/30 hover:bg-base-200"
          type="button"
        >
          <i class="icon-[ri--github-fill] text-lg" />
          GitHub
        </button>
        <button
          class="btn btn-outline h-11 rounded-box border-base-content/10 bg-base-100/60 font-normal text-base-content/80 hover:border-primary/30 hover:bg-base-200"
          type="button"
        >
          <i class="icon-[ri--google-fill] text-base text-primary" />
          Google
        </button>
      </div>
    </form>
  )
}
