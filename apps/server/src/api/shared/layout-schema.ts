import type { MenuItem } from '../../service/admin/system/menu/consts'
import { z } from 'zod'
import { userProfileSchema } from '../auth/schema'

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
  menus: z.array(menuItemSchema),
  siteTitle: z.string(),
  user: userProfileSchema.nullable(),
})

export type LayoutPayload = z.infer<typeof layoutPayloadSchema>
