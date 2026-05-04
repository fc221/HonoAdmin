import type { Migration } from './types'
import { migration0001AdminCore } from './0001_admin_core'
import { migration0002SiteManagement } from './0002_site_management'
import { migration0003UserContactStatus } from './0003_user_contact_status'
import { migration0004AdminPerformanceIndexes } from './0004_admin_performance_indexes'
import { migration0005AdminRbac } from './0005_admin_rbac'
import { migration0006AdminPermissionCatalog } from './0006_admin_permission_catalog'
import { migration0007AdminPermissionActions } from './0007_admin_permission_actions'
import { migration0008SystemFileManagement } from './0008_system_file_management'
import { migration0009SystemUpdateManagement } from './0009_system_update_management'
import { migration0010SiteConfigAndMigrationUpdate } from './0010_site_config_and_migration_update'
import { migration0011UserProfileFields } from './0011_user_profile_fields'

export const migrations: Migration[] = [
  migration0001AdminCore,
  migration0002SiteManagement,
  migration0003UserContactStatus,
  migration0004AdminPerformanceIndexes,
  migration0005AdminRbac,
  migration0006AdminPermissionCatalog,
  migration0007AdminPermissionActions,
  migration0008SystemFileManagement,
  migration0009SystemUpdateManagement,
  migration0010SiteConfigAndMigrationUpdate,
  migration0011UserProfileFields,
]
