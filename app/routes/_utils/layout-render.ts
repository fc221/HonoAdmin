export interface LayoutRenderOptions {
  currentMenuName?: string
  layout?: false
  pageTitle?: string
}

export function isLayoutDisabled(options: LayoutRenderOptions): boolean {
  return options.layout === false
}
