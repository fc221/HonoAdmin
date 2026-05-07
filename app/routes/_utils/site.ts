import type { Context } from 'hono'
import type { SiteConfig } from '../../service/admin/system/config/dto'
import { getSiteConfig } from '../../service/admin/system/config'
import { getDatabaseMigrationStatus } from '../../service/admin/system/update'

export async function getRenderableSiteConfig(
  c: Context,
): Promise<SiteConfig> {
  const fallback = getFallbackSiteConfig(c)

  if (!c.config.bootstrap.isConfigured) {
    return fallback
  }

  const migration = await getDatabaseMigrationStatus(c)
  if (!migration.isComplete) {
    return fallback
  }

  return getSiteConfig(c)
}

export function formatPageTitle(
  pageTitle: string,
  siteTitle: string,
): string {
  return `${pageTitle} - ${siteTitle}`
}

function getFallbackSiteConfig(c: Context): SiteConfig {
  return {
    description: '',
    keywords: '',
    subtitle: '',
    title: c.config.appName || 'HonoAdmin',
  }
}
