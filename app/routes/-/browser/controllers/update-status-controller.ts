import { Controller } from '@hotwired/stimulus'

interface UpdateStatusResult {
  data?: {
    migration?: { pendingCount?: unknown }
  }
  ok?: unknown
}

interface UpdateStatusCache {
  expiresAt: number
  pendingCount: number
}

const updateStatusCacheTtlMs = 60_000

let updateStatusCache: UpdateStatusCache | null = null
let updateStatusRequest: Promise<number> | null = null

export default class UpdateStatusController extends Controller<HTMLElement> {
  static targets = ['link']

  declare readonly linkTarget: HTMLAnchorElement
  declare readonly hasLinkTarget: boolean

  connect() {
    if (this.hasLinkTarget) {
      void this.load()
    }
  }

  private async load() {
    try {
      const pendingCount = await getPendingMigrationCount({
        force: window.location.pathname === '/admin/system/update',
      })

      if (pendingCount <= 0) {
        this.linkTarget.hidden = true
        return
      }

      this.linkTarget.title = `待执行 ${pendingCount} 个数据库迁移`
      this.linkTarget.hidden = false
    } catch {
      this.linkTarget.hidden = true
    }
  }
}

async function getPendingMigrationCount({ force }: { force: boolean }) {
  const now = Date.now()

  if (!force && updateStatusCache && updateStatusCache.expiresAt > now) {
    return updateStatusCache.pendingCount
  }

  if (!force && updateStatusRequest) {
    return updateStatusRequest
  }

  updateStatusRequest = fetchPendingMigrationCount()
    .then((pendingCount) => {
      updateStatusCache = {
        expiresAt: Date.now() + updateStatusCacheTtlMs,
        pendingCount,
      }
      return pendingCount
    })
    .finally(() => {
      updateStatusRequest = null
    })

  return updateStatusRequest
}

async function fetchPendingMigrationCount() {
  const response = await fetch('/admin/system/update/status', {
    headers: {
      Accept: 'application/json',
    },
  })
  const result = response.ok
    ? await response.json() as UpdateStatusResult
    : null

  return result?.ok === true
    && typeof result.data?.migration?.pendingCount === 'number'
    ? result.data.migration.pendingCount
    : 0
}
