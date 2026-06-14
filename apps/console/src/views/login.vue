<script setup lang="ts">
import type { DropdownOption, FormInst, FormRules } from 'naive-ui'
import { NButton, NCheckbox, NDropdown, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '../api/client'
import AppIcon from '../components/AppIcon.vue'
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const themeStore = useThemeStore()
const { selectedTheme } = storeToRefs(themeStore)
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const form = reactive({
  password: '',
  remember: true,
  username: '',
})
const rules: FormRules = {
  password: [{ message: '请输入密码', required: true, trigger: ['blur', 'input'] }],
  username: [{ message: '请输入用户名', required: true, trigger: ['blur', 'input'] }],
}
const loginInputThemeOverrides = {
  heightLarge: '48px',
}
const themeDropdownOptions = computed<DropdownOption[]>(() =>
  themeStore.themeOptions.map(option => ({
    icon: () => h(AppIcon, { name: option.icon }),
    key: option.value,
    label: () => h('span', { class: 'flex min-w-0 items-center justify-between gap-3' }, [
      h('span', { class: 'truncate' }, option.label),
      selectedTheme.value === option.value
        ? h(AppIcon, { class: 'text-primary', name: 'ri:check-line' })
        : null,
    ]),
  })),
)

const surface = computed<'admin' | 'user'>(() =>
  route.path.startsWith('/user') ? 'user' : 'admin',
)
const loginPath = computed(() =>
  surface.value === 'user' ? '/user/login' : '/admin/login',
)
const fallbackPath = computed(() =>
  surface.value === 'user' ? '/user/dashboard' : '/admin/dashboard',
)

async function submit() {
  try {
    await formRef.value?.validate()
  }
  catch {
    message.warning('请填写账号和密码')
    return
  }

  loading.value = true
  try {
    await apiClient.login(form)
    await router.push(getReturnTo())
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败')
  }
  finally {
    loading.value = false
  }
}

function getReturnTo() {
  const returnTo = Array.isArray(route.query.returnTo)
    ? route.query.returnTo[0]
    : route.query.returnTo
  const expectedPrefix = surface.value === 'user' ? '/user/' : '/admin/'

  return typeof returnTo === 'string'
    && returnTo.startsWith(expectedPrefix)
    && returnTo !== loginPath.value
    ? returnTo
    : fallbackPath.value
}
</script>

<template>
  <main class="login-page flex min-h-screen items-center justify-center p-4 text-base-content">
    <div class="login-shell grid min-h-174.5 w-full max-w-275 overflow-hidden rounded-box border border-base-border shadow-2xl backdrop-blur lg:min-h-172.5 lg:grid-cols-2">
      <aside class="login-brand-panel hidden flex-col justify-between p-12 lg:flex">
        <div>
          <a class="mb-12 flex w-fit items-center gap-3" href="/">
            <span class="login-mark grid size-10 place-items-center rounded-box text-xl text-primary-content shadow-lg">
              <AppIcon name="ri:flashlight-line" />
            </span>
            <span class="text-2xl font-semibold text-base-content">HonoAdmin</span>
          </a>

          <h1 class="mb-6 text-4xl font-semibold leading-tight text-base-content">
            高性能通用后台框架<br>
            <span class="text-primary">为边缘计算而生</span>
          </h1>

          <ul class="space-y-4 text-base-soft">
            <li class="flex items-center gap-3">
              <AppIcon class="text-xl text-primary" name="ri:checkbox-circle-line" />
              <span>兼容 Node.js, Bun, Cloudflare Workers</span>
            </li>
            <li class="flex items-center gap-3">
              <AppIcon class="text-xl text-primary" name="ri:checkbox-circle-line" />
              <span>原生 SQL 支持，极简的数据访问层</span>
            </li>
            <li class="flex items-center gap-3">
              <AppIcon class="text-xl text-primary" name="ri:checkbox-circle-line" />
              <span>内置 RBAC 权限体系与角色管理</span>
            </li>
          </ul>
        </div>

        <div class="login-terminal rounded-box border border-base-border p-5 shadow-sm backdrop-blur">
          <div class="mb-4 flex items-center gap-2">
            <span class="size-2 rounded-full bg-error" />
            <span class="size-2 rounded-full bg-warning" />
            <span class="size-2 rounded-full bg-success" />
            <span class="ml-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-base-muted">Terminal Preview</span>
          </div>
          <code class="block font-mono text-xs leading-6 text-primary">
            <span class="block">$ git clone https://github.com/fc221/HonoAdmin.git</span>
            <span class="block text-base-muted">&gt; cd HonoAdmin &amp;&amp; bun install</span>
            <span class="block text-base-muted">&gt; Runtime detected: <span class="text-success">Bun</span></span>
            <span class="block text-success">✓ bun run dev at http://localhost:5173</span>
          </code>
        </div>
      </aside>

      <section class="login-form-panel flex flex-col justify-center p-8 md:p-12 lg:p-16">
        <div class="mx-auto w-full max-w-105">
          <div class="mb-8 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="mb-6 flex items-center gap-3 lg:hidden">
                <span class="login-mark grid size-10 place-items-center rounded-box text-xl text-primary-content shadow-lg">
                  <AppIcon name="ri:flashlight-line" />
                </span>
                <span class="text-2xl font-semibold text-base-content">HonoAdmin</span>
              </div>
              <h2 class="mb-2 text-2xl font-semibold text-base-content">
                欢迎回来
              </h2>
              <p class="text-sm leading-6 text-base-muted">
                请输入您的账号信息以访问管理系统
              </p>
            </div>

            <NDropdown :options="themeDropdownOptions" trigger="hover" :width="176" @select="key => themeStore.setTheme(key)">
              <NButton quaternary circle aria-label="切换主题">
                <template #icon>
                  <AppIcon name="ri:palette-line" />
                </template>
              </NButton>
            </NDropdown>
          </div>

          <NForm
            ref="formRef"
            class="login-form space-y-5"
            :model="form"
            :rules="rules"
            :show-require-mark="false"
            @submit.prevent="submit"
          >
            <div>
              <div class="mb-2 text-xs font-medium text-base-soft">
                账号
              </div>
              <NFormItem path="username" :show-feedback="false" :show-label="false">
                <NInput
                  v-model:value="form.username"
                  autocomplete="username"
                  placeholder="root / name@example.com"
                  size="large"
                  :theme-overrides="loginInputThemeOverrides"
                >
                  <template #prefix>
                    <AppIcon name="ri:mail-line" />
                  </template>
                </NInput>
              </NFormItem>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-4 text-xs font-medium">
                <span class="text-base-soft">密码</span>
                <a class="text-primary" href="mailto:admin@example.com?subject=Reset%20HonoAdmin%20password">
                  忘记密码？
                </a>
              </div>
              <NFormItem path="password" :show-feedback="false" :show-label="false">
                <NInput
                  v-model:value="form.password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  show-password-on="click"
                  size="large"
                  :theme-overrides="loginInputThemeOverrides"
                  type="password"
                >
                  <template #prefix>
                    <AppIcon name="ri:lock-line" />
                  </template>
                </NInput>
              </NFormItem>
            </div>

            <NCheckbox v-model:checked="form.remember">
              记住登录状态
            </NCheckbox>

            <NButton attr-type="submit" block class="login-submit" :loading="loading" type="primary">
              <template #icon>
                <AppIcon name="ri:arrow-right-line" />
              </template>
              立即登录
            </NButton>

            <div class="relative mt-5! py-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-base-border" />
              </div>
              <div class="relative flex justify-center text-xs">
                <span class="bg-base-card px-3 text-base-muted">或者使用</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <NButton attr-type="button" class="login-social-button" secondary>
                <template #icon>
                  <AppIcon name="ri:github-line" />
                </template>
                GitHub
              </NButton>
              <NButton attr-type="button" class="login-social-button" secondary>
                <template #icon>
                  <AppIcon class="text-primary" name="ri:google-fill" />
                </template>
                Google
              </NButton>
            </div>
          </NForm>

          <p class="mt-8 text-center text-sm text-base-muted">
            还没有账号？
            <a class="font-semibold text-base-content" href="#register">注册账号</a>
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent 40%),
    radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--primary-color) 8%, transparent), transparent 42%),
    var(--body-color);
}

.login-shell {
  background: color-mix(in srgb, var(--card-color) 75%, transparent);
  box-shadow: 0 25px 50px -12px color-mix(in srgb, var(--text-color-1) 10%, transparent);
}

.login-brand-panel {
  background: color-mix(in srgb, var(--table-header-color) 35%, transparent);
  border-right: 1px solid var(--border-color);
}

.login-form-panel {
  background: color-mix(in srgb, var(--card-color) 70%, transparent);
}

.login-mark {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-pressed));
  box-shadow: 0 10px 18px -8px color-mix(in srgb, var(--primary-color) 70%, transparent);
}

.login-terminal {
  background: color-mix(in srgb, var(--card-color) 55%, transparent);
}

.login-submit {
  height: 48px;
  font-weight: 600;
  box-shadow: 0 10px 18px -8px color-mix(in srgb, var(--primary-color) 75%, transparent);
}

.login-social-button {
  height: 44px;
}

@media (max-width: 1023px) {
  .login-brand-panel {
    border-right: 0;
  }
}
</style>
