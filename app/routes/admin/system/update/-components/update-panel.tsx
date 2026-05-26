import type { PageAlertState } from '../../../../-/components/page-alert'
import type { UpdateStatus } from '../../../../../service/admin/system/update/dto'
import PageAlert from '../../../../-/components/page-alert'
import { topLevelFormTurboAttrs } from '../../../../-/components/turbo-frame'

interface Props {
  alert?: PageAlertState
  canMigrate: boolean
  demoMode?: boolean
  status: UpdateStatus
}

export default function UpdatePanel({
  alert,
  canMigrate,
  demoMode = false,
  status,
}: Props) {
  const migration = status.migration
  const migrateDisabled = migration.isComplete || !canMigrate || demoMode
  const migrateTitle = demoMode ? '演示模式下禁止执行迁移' : undefined

  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold">更新管理</h1>
            <p class="mt-1 text-sm text-base-content/60">
              查看当前代码 migration 状态，并由 root 管理员手动执行待迁移项。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <form method="post" {...topLevelFormTurboAttrs}>
              <button
                class="btn btn-warning btn-sm"
                disabled={migrateDisabled}
                name="intent"
                title={migrateTitle}
                type="submit"
                value="migrate"
              >
                <i class="icon-[ri--database-2-line]" />
                执行迁移
              </button>
            </form>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusItem label="当前版本" value={status.currentVersion} />
          <StatusItem
            label="代码迁移"
            value={migration.latestCodeMigrationId ?? '-'}
          />
          <StatusItem
            label="已应用迁移"
            value={migration.latestAppliedMigrationId ?? '-'}
          />
          <StatusItem
            label="待执行迁移"
            value={migration.isComplete
              ? '0'
              : String(migration.pendingCount)}
          />
        </div>

        {!migration.isComplete
          ? (
              <div class="mt-4 rounded-box border border-warning/40 bg-warning/10 p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="font-semibold text-warning">数据库需要迁移</p>
                    <p class="mt-1 text-sm text-base-content/70">
                      当前代码最新迁移：
                      {migration.latestCodeMigrationId ?? '-'}
                      ；已应用：
                      {migration.latestAppliedMigrationId ?? '-'}
                    </p>
                  </div>
                  <div class="max-h-36 min-w-64 overflow-auto rounded-box bg-base-100 p-3 text-sm">
                    {migration.pendingMigrations.map((item) => (
                      <div key={item.id} class="flex justify-between gap-3">
                        <span class="font-mono">{item.id}</span>
                        <span class="text-base-content/60">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          : null}
      </section>
    </div>
  )
}

function StatusItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
      <p class="text-xs text-base-content/55">{label}</p>
      <p class="mt-2 break-all font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
