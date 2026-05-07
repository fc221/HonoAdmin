import type { MigrationStatus } from '../../../infra/database'
import type { BootstrapConfigStatus } from '../../../infra/runtime'
import type { PageAlertState } from '../../_components/_page-alert'
import PageAlert from '../../_components/_page-alert'

interface Props {
  alert?: PageAlertState
}

export default function InstallForm({ alert }: Props) {
  return (
    <form class="space-y-5" method="post">
      <PageAlert alert={alert} />

      <fieldset class="fieldset">
        <legend class="fieldset-legend">站点标题</legend>
        <label class="input input-bordered flex w-full items-center gap-3">
          <i class="icon-[ri--building-4-line] text-base-content/50" />
          <input
            class="grow"
            name="siteName"
            type="text"
            placeholder="HonoAdmin"
            value="HonoAdmin"
            required
          />
        </label>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">管理员账号</legend>
        <label class="input input-bordered flex w-full items-center gap-3">
          <i class="icon-[ri--user-star-line] text-base-content/50" />
          <input
            class="grow"
            name="username"
            type="text"
            autocomplete="username"
            placeholder="admin"
            value="admin"
            required
          />
        </label>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">管理员密码</legend>
          <label class="input input-bordered flex w-full items-center gap-3">
            <i class="icon-[ri--lock-password-line] text-base-content/50" />
            <input
              class="grow"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="至少 6 位"
              required
            />
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">确认密码</legend>
          <label class="input input-bordered flex w-full items-center gap-3">
            <i class="icon-[ri--lock-2-line] text-base-content/50" />
            <input
              class="grow"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入"
              required
            />
          </label>
        </fieldset>
      </div>

      <button class="btn btn-primary w-full" type="submit">
        <i class="icon-[ri--rocket-line]" />
        完成安装
      </button>
    </form>
  )
}

export function RuntimeConfigStep({
  bootstrap,
  generatedSecret,
}: {
  bootstrap: BootstrapConfigStatus
  generatedSecret: string
}) {
  if (bootstrap.runtimeTarget === 'cloudflare-workers') {
    return <WorkerConfigNotice bootstrap={bootstrap} generatedSecret={generatedSecret} />
  }

  const values = getBunRuntimeConfigValues(bootstrap, generatedSecret)

  return (
    <form class="space-y-5" method="post">
      <input name="intent" type="hidden" value="save-runtime-config" />
      <fieldset class="fieldset">
        <legend class="fieldset-legend">数据库地址</legend>
        <input
          class="input w-full"
          name="databaseUrl"
          required
          value={values.databaseUrl}
        />
        <p class="label">
          支持 SQLite 文件路径、mysql://、mysql2://、postgres://、postgresql://。
        </p>
      </fieldset>
      <div class="grid gap-4 sm:grid-cols-2">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">应用时区</legend>
          <input
            class="input w-full"
            name="appTimezone"
            required
            value={values.appTimezone}
          />
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">缓存命名空间</legend>
          <input
            class="input w-full"
            name="cacheNamespace"
            required
            value={values.cacheNamespace}
          />
        </fieldset>
      </div>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">JWT Secret</legend>
        <input
          class="input w-full font-mono"
          name="jwtSecret"
          required
          minlength={16}
          value={values.jwtSecret}
        />
        <p class="label">
          保存后立即生效，并写入
          {bootstrap.configPath ?? '.env'}
          。
        </p>
      </fieldset>
      <button class="btn btn-primary w-full" type="submit">
        <i class="icon-[ri--save-3-line]" />
        写入配置文件
      </button>
    </form>
  )
}

export function MigrationStep({ migration }: { migration: MigrationStatus }) {
  return (
    <div class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-3">
        <MigrationStat label="代码版本" value={migration.latestCodeMigrationId ?? '-'} />
        <MigrationStat label="已应用" value={migration.latestAppliedMigrationId ?? '-'} />
        <MigrationStat label="待执行" value={String(migration.pendingCount)} />
      </div>
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <p class="font-semibold">待执行迁移</p>
        <div class="mt-3 max-h-64 space-y-2 overflow-auto">
          {migration.pendingMigrations.map((item) => (
            <div
              key={item.id}
              class="flex items-center justify-between gap-3 rounded-box bg-base-100 px-3 py-2 text-sm"
            >
              <span class="font-mono">{item.id}</span>
              <span class="text-base-content/60">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
      <form method="post">
        <input name="intent" type="hidden" value="migrate" />
        <button class="btn btn-primary w-full" type="submit">
          <i class="icon-[ri--database-2-line]" />
          {migration.isFreshDatabase ? '初始化数据库' : '执行数据库迁移'}
        </button>
      </form>
    </div>
  )
}

function WorkerConfigNotice({
  bootstrap,
  generatedSecret,
}: {
  bootstrap: BootstrapConfigStatus
  generatedSecret: string
}) {
  const missingLabels = bootstrap.requirements
    .filter((requirement) => !requirement.isConfigured)
    .map((requirement) => requirement.label)

  return (
    <div class="space-y-5">
      <div class="alert alert-warning">
        <i class="icon-[ri--error-warning-line]" />
        <span>
          缺少配置：
          {missingLabels.join('、') || '无'}
        </span>
      </div>
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <p class="font-semibold">wrangler.jsonc 示例</p>
        <pre class="mt-3 overflow-auto rounded-box bg-base-100 p-3 text-xs">
          <code>
            {`{
  "vars": {
    "APP_TIMEZONE": "Asia/Shanghai"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hono-admin",
      "database_id": "<your-d1-database-id>"
    }
  ]
}`}
          </code>
        </pre>
      </div>
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <p class="font-semibold">Secret 示例</p>
        <pre class="mt-3 overflow-auto rounded-box bg-base-100 p-3 text-xs">
          <code>
            {`wrangler secret put JWT_SECRET
${generatedSecret}`}
          </code>
        </pre>
      </div>
    </div>
  )
}

function MigrationStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
      <p class="text-xs text-base-content/55">{label}</p>
      <p class="mt-1 break-all font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function getBunRuntimeConfigValues(
  bootstrap: BootstrapConfigStatus,
  generatedSecret: string,
) {
  const jwtSecret = bootstrap.requirements.find((requirement) =>
    requirement.key === 'JWT_SECRET'
  )

  return {
    appTimezone: getRequirementValue(bootstrap, 'APP_TIMEZONE') || 'Asia/Shanghai',
    cacheNamespace: getRequirementValue(bootstrap, 'CACHE_NAMESPACE') || 'honox-admin',
    databaseUrl: getRequirementValue(bootstrap, 'DATABASE_URL') || './honox-admin.sqlite',
    jwtSecret: jwtSecret?.isConfigured
      ? jwtSecret.value ?? ''
      : generatedSecret,
  }
}

function getRequirementValue(
  bootstrap: BootstrapConfigStatus,
  key: string,
): string {
  return bootstrap.requirements.find((requirement) => requirement.key === key)
    ?.value ?? ''
}
