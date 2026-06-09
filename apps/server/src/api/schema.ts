import type { MenuItem } from '../service/admin/system/menu/consts'
import { z } from 'zod'
import { userProfileSchema } from './auth/schema'

export { adminMenus, userMenus } from '../service/admin/system/menu/consts'
export type { MenuItem } from '../service/admin/system/menu/consts'

export * from './admin/system/config/schema'
export * from './auth/schema'
export * from './install/schema'
export * from './shared/resource-schema'
export * from './user/profile/schema'

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    children: z.array(menuItemSchema).optional(),
    component: z.string().optional(),
    defaultOpen: z.boolean().optional(),
    href: z.string().optional(),
    icon: z.string(),
    label: z.string(),
    name: z.string(),
    routePath: z.string().optional(),
  })
)

export const layoutPayloadSchema = z.object({
  activeMenuName: z.string(),
  menus: z.array(menuItemSchema),
  siteTitle: z.string(),
  user: userProfileSchema.nullable(),
})

export const dashboardStatSchema = z.object({
  label: z.string(),
  tone: z.enum(['default', 'primary', 'success', 'warning']).default('default'),
  value: z.string(),
})

export const dashboardPayloadSchema = z.object({
  stats: z.array(dashboardStatSchema),
  title: z.string(),
})

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>
export type LayoutPayload = z.infer<typeof layoutPayloadSchema>
