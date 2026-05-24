import type { Child } from 'hono/jsx'

export const listFrameId = 'admin-list-frame'
export const topLevelFormTurboAttrs = {
  'data-turbo': 'true',
  'data-turbo-action': 'replace',
  'data-turbo-frame': '_top',
} as const

export function ListTurboFrame({ children }: { children: Child }) {
  return (
    <turbo-frame id={listFrameId}>
      {children}
    </turbo-frame>
  )
}
