import type { Context } from 'hono'
import type { LayoutVariant } from '../components/layout/config'
import { getCookie } from 'hono/cookie'
import {
  isLayoutVariant,
  layoutVariantCookieName,
} from '../components/layout/config'

export function resolveLayoutVariantFromRequest(
  c: Context,
): LayoutVariant | null {
  const value = getCookie(c, layoutVariantCookieName)
  return isLayoutVariant(value) ? value : null
}
