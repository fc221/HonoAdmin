import type {
  BorderWidthValue,
  DaisyColorPalette,
  DaisyTheme,
  DaisyThemeName,
  LayoutConfig,
  LayoutVariant,
  RadiusValue,
  SizeValue,
  ThemeName,
} from '../../components/layout/config'
import { Controller } from '@hotwired/stimulus'
import {
  buildCustomThemeCss,
  customThemeStyleId,
  daisyColorKeys,
  defaultLayoutConfig,
  isBorderWidthValue,
  isLayoutVariant,
  isRadiusValue,
  isSizeValue,
  isThemeName,
  layoutConfigStorageKey,
  layoutPreset,
  layoutVariantCookieName,
  lightThemeDefaults,
  sanitizeCustomTheme,
  systemThemeQuery,
} from '../../components/layout/config'

const drawerAnimationDuration = 220

export default class SettingsController extends Controller<HTMLElement> {
  static targets = [
    'overlay',
    'panel',
    'themeOption',
    'themeCheck',
    'variantOption',
    'variantCheck',
    'sidebarCollapsed',
    'colorSwatch',
    'colorPopover',
    'saturationPicker',
    'saturationHandle',
    'huePicker',
    'hueHandle',
    'alphaPicker',
    'alphaGradient',
    'alphaHandle',
    'hexInput',
    'radiusOption',
    'sizeOption',
    'borderOption',
    'depthToggle',
    'noiseToggle',
    'copyButton',
    'copyLabel',
  ]

  declare readonly overlayTarget: HTMLElement
  declare readonly panelTarget: HTMLElement
  declare readonly themeOptionTargets: HTMLElement[]
  declare readonly themeCheckTargets: HTMLElement[]
  declare readonly variantOptionTargets: HTMLElement[]
  declare readonly variantCheckTargets: HTMLElement[]
  declare readonly sidebarCollapsedTarget: HTMLInputElement
  declare readonly hasSidebarCollapsedTarget: boolean
  declare readonly colorSwatchTargets: HTMLElement[]
  declare readonly colorPopoverTargets: HTMLElement[]
  declare readonly saturationPickerTargets: HTMLElement[]
  declare readonly saturationHandleTargets: HTMLElement[]
  declare readonly huePickerTargets: HTMLElement[]
  declare readonly hueHandleTargets: HTMLElement[]
  declare readonly alphaPickerTargets: HTMLElement[]
  declare readonly alphaGradientTargets: HTMLElement[]
  declare readonly alphaHandleTargets: HTMLElement[]
  declare readonly hexInputTargets: HTMLInputElement[]
  declare readonly radiusOptionTargets: HTMLElement[]
  declare readonly sizeOptionTargets: HTMLElement[]
  declare readonly borderOptionTargets: HTMLElement[]
  declare readonly depthToggleTarget: HTMLInputElement
  declare readonly noiseToggleTarget: HTMLInputElement
  declare readonly hasDepthToggleTarget: boolean
  declare readonly hasNoiseToggleTarget: boolean
  declare readonly copyButtonTarget: HTMLButtonElement
  declare readonly copyLabelTarget: HTMLElement
  declare readonly hasCopyButtonTarget: boolean
  declare readonly hasCopyLabelTarget: boolean

  private mediaQuery: MediaQueryList | null = null
  private themeSwitchFrame = 0
  private copyResetTimer = 0
  private colorPopoverFrame = 0
  private drawerAnimationFrame = 0
  private drawerCloseTimer = 0
  private colorPickerState = new Map<string, { h: number, s: number, v: number, a: number }>()

  connect() {
    this.mediaQuery = window.matchMedia(systemThemeQuery)
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
    window.addEventListener('resize', this.scheduleOpenColorPopoverPositions)
    window.addEventListener('scroll', this.scheduleOpenColorPopoverPositions, true)
    this.sync()
  }

  disconnect() {
    this.mediaQuery?.removeEventListener('change', this.handleSystemThemeChange)
    window.removeEventListener('resize', this.scheduleOpenColorPopoverPositions)
    window.removeEventListener('scroll', this.scheduleOpenColorPopoverPositions, true)
    cancelAnimationFrame(this.colorPopoverFrame)
    cancelAnimationFrame(this.drawerAnimationFrame)
    if (this.drawerCloseTimer) {
      window.clearTimeout(this.drawerCloseTimer)
    }
    if (this.copyResetTimer) {
      window.clearTimeout(this.copyResetTimer)
    }
  }

  open() {
    this.cancelDrawerClose()
    this.panelTarget.classList.remove('hidden')
    this.overlayTarget.classList.remove('hidden')
    this.panelTarget.classList.add('flex')

    this.drawerAnimationFrame = requestAnimationFrame(() => {
      this.panelTarget.classList.remove('translate-x-full', 'opacity-0')
      this.panelTarget.classList.add('translate-x-0', 'opacity-100')
      this.overlayTarget.classList.remove('opacity-0')
      this.overlayTarget.classList.add('opacity-100')
    })
  }

  close() {
    this.hideOpenColorPopovers()
    this.cancelDrawerClose()
    this.panelTarget.classList.remove('translate-x-0', 'opacity-100')
    this.panelTarget.classList.add('translate-x-full', 'opacity-0')
    this.overlayTarget.classList.remove('opacity-100')
    this.overlayTarget.classList.add('opacity-0')

    this.drawerCloseTimer = window.setTimeout(() => {
      this.panelTarget.classList.add('hidden')
      this.panelTarget.classList.remove('flex')
      this.overlayTarget.classList.add('hidden')
      this.drawerCloseTimer = 0
    }, drawerAnimationDuration)
  }

  private cancelDrawerClose() {
    cancelAnimationFrame(this.drawerAnimationFrame)
    if (!this.drawerCloseTimer) {
      return
    }

    window.clearTimeout(this.drawerCloseTimer)
    this.drawerCloseTimer = 0
  }

  selectTheme(event: Event) {
    const target = event.currentTarget as HTMLElement
    const theme = target.dataset.settingsThemeValue
    if (!isThemeName(theme)) {
      return
    }

    const config = readStoredLayoutConfig()
    persistLayoutConfig({ ...config, theme })
    this.applyTheme(theme)
    this.syncThemeOptions(theme)
  }

  selectVariant(event: Event) {
    const target = event.currentTarget as HTMLElement
    const variant = target.dataset.settingsVariantValue
    if (!isLayoutVariant(variant)) {
      return
    }

    const config = readStoredLayoutConfig()
    if (config.variant === variant) {
      return
    }

    persistLayoutConfig({ ...config, variant })
    writeVariantCookie(variant)
    window.location.reload()
  }

  toggleSidebarCollapsed(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const config = readStoredLayoutConfig()
    persistLayoutConfig({ ...config, sidebarCollapsed: target.checked })
    document.documentElement.dataset.sidebarCollapsed = target.checked ? 'true' : 'false'
  }

  initColorPicker(event: Event) {
    const popover = event.currentTarget as HTMLElement
    const key = popover.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key || !daisyColorKeys.includes(key)) {
      return
    }

    const toggleState = getPopoverToggleState(event)
    const isOpen = toggleState ? toggleState === 'open' : isColorPopoverOpen(popover)
    popover.toggleAttribute('data-settings-popover-open', isOpen)
    if (!isOpen) {
      popover.style.visibility = 'hidden'
      return
    }

    const config = readStoredLayoutConfig()
    const hexColor = config.customTheme.colors[key]
    const hsva = this.hexToHsva(hexColor)
    this.colorPickerState.set(key, hsva)
    this.updateColorPickerUI(key, hsva)
    this.positionColorPopover(popover)
    this.scheduleOpenColorPopoverPositions()
  }

  private scheduleOpenColorPopoverPositions = () => {
    cancelAnimationFrame(this.colorPopoverFrame)
    this.colorPopoverFrame = requestAnimationFrame(() => {
      for (const popover of this.colorPopoverTargets) {
        if (isColorPopoverOpen(popover)) {
          this.positionColorPopover(popover)
        }
      }
    })
  }

  private positionColorPopover(popover: HTMLElement) {
    const key = popover.dataset.settingsColorKey
    const swatch = this.colorSwatchTargets.find((target) => target.dataset.settingsColorKey === key)
    if (!swatch) {
      return
    }

    const viewportPadding = 12
    const gap = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2)
    const maxHeight = Math.max(0, viewportHeight - viewportPadding * 2)

    popover.style.position = 'fixed'
    popover.style.inset = 'auto'
    popover.style.margin = '0'
    popover.style.right = 'auto'
    popover.style.bottom = 'auto'
    popover.style.maxWidth = `${maxWidth}px`
    popover.style.maxHeight = `${maxHeight}px`

    const swatchRect = swatch.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const popoverWidth = Math.min(popoverRect.width || 256, maxWidth)
    const popoverHeight = Math.min(popoverRect.height || 360, maxHeight)
    const availableBelow = viewportHeight - swatchRect.bottom - gap - viewportPadding
    const availableAbove = swatchRect.top - gap - viewportPadding

    let left = swatchRect.left
    let top = availableBelow >= popoverHeight || availableBelow >= availableAbove
      ? swatchRect.bottom + gap
      : swatchRect.top - popoverHeight - gap

    left = clamp(left, viewportPadding, viewportWidth - viewportPadding - popoverWidth)
    top = clamp(top, viewportPadding, viewportHeight - viewportPadding - popoverHeight)

    popover.style.left = `${left}px`
    popover.style.top = `${top}px`
    popover.style.visibility = 'visible'
  }

  private hideOpenColorPopovers() {
    for (const popover of this.colorPopoverTargets) {
      const wasOpen = isColorPopoverOpen(popover)
      popover.removeAttribute('data-settings-popover-open')
      popover.style.visibility = 'hidden'
      if (!wasOpen) {
        continue
      }
      const popoverApi = popover as HTMLElement & { hidePopover?: () => void }
      popoverApi.hidePopover?.()
    }
  }

  startSaturationPick(event: MouseEvent) {
    const picker = event.currentTarget as HTMLElement
    const key = picker.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key) return

    const updatePosition = (e: MouseEvent) => {
      const rect = picker.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
      const s = (x / rect.width) * 100
      const v = 100 - (y / rect.height) * 100

      const state = this.colorPickerState.get(key) ?? { h: 0, s: 100, v: 100, a: 1 }
      state.s = s
      state.v = v
      this.colorPickerState.set(key, state)
      this.updateColorFromHsva(key, state)
    }

    updatePosition(event)

    const handleMove = (e: MouseEvent) => updatePosition(e)
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  startHuePick(event: MouseEvent) {
    const picker = event.currentTarget as HTMLElement
    const key = picker.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key) return

    const updatePosition = (e: MouseEvent) => {
      const rect = picker.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const h = (x / rect.width) * 360

      const state = this.colorPickerState.get(key) ?? { h: 0, s: 100, v: 100, a: 1 }
      state.h = h
      this.colorPickerState.set(key, state)
      this.updateColorFromHsva(key, state)
    }

    updatePosition(event)

    const handleMove = (e: MouseEvent) => updatePosition(e)
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  startAlphaPick(event: MouseEvent) {
    const picker = event.currentTarget as HTMLElement
    const key = picker.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key) return

    const updatePosition = (e: MouseEvent) => {
      const rect = picker.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const a = x / rect.width

      const state = this.colorPickerState.get(key) ?? { h: 0, s: 100, v: 100, a: 1 }
      state.a = a
      this.colorPickerState.set(key, state)
      this.updateColorFromHsva(key, state)
    }

    updatePosition(event)

    const handleMove = (e: MouseEvent) => updatePosition(e)
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  updateFromHex(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const key = input.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key || !daisyColorKeys.includes(key)) {
      return
    }

    const value = input.value.trim()
    if (!(/^#[\da-f]{6}(?:[\da-f]{2})?$/i).test(value)) {
      return
    }

    const hsva = this.hexToHsva(value)
    this.colorPickerState.set(key, hsva)
    this.updateColorFromHsva(key, hsva)
  }

  private updateColorFromHsva(key: keyof DaisyColorPalette, hsva: { h: number, s: number, v: number, a: number }) {
    const hex = this.hsvaToHex(hsva)
    this.updateCustomTheme((theme) => ({
      ...theme,
      colors: { ...theme.colors, [key]: hex },
    }))
    this.updateColorPickerUI(key, hsva)
  }

  private updateColorPickerUI(key: keyof DaisyColorPalette, hsva: { h: number, s: number, v: number, a: number }) {
    const saturationHandle = this.saturationHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const hueHandle = this.hueHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const alphaHandle = this.alphaHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const alphaGradient = this.alphaGradientTargets.find((el) => el.dataset.settingsColorKey === key)
    const hexInput = this.hexInputTargets.find((el) => el.dataset.settingsColorKey === key)
    const saturationPicker = this.saturationPickerTargets.find((el) => el.dataset.settingsColorKey === key)

    if (saturationHandle) {
      saturationHandle.style.left = `${hsva.s}%`
      saturationHandle.style.top = `${100 - hsva.v}%`
    }

    if (hueHandle) {
      hueHandle.style.left = `${(hsva.h / 360) * 100}%`
    }

    if (alphaHandle) {
      alphaHandle.style.left = `${hsva.a * 100}%`
    }

    const baseColor = this.hsvToRgb(hsva.h, 100, 100)
    if (saturationPicker) {
      saturationPicker.style.background = `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b}))`
    }

    const rgb = this.hsvToRgb(hsva.h, hsva.s, hsva.v)
    if (alphaGradient) {
      alphaGradient.style.background = `linear-gradient(to right, transparent, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`
    }

    if (hexInput) {
      hexInput.value = this.hsvaToHex(hsva)
    }
  }

  private hexToHsva(hex: string): { h: number, s: number, v: number, a: number } {
    const cleanHex = hex.replace('#', '')
    const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255
    const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255
    const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255
    const a = cleanHex.length === 8 ? Number.parseInt(cleanHex.substring(6, 8), 16) / 255 : 1

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6)
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2)
      } else {
        h = 60 * ((r - g) / delta + 4)
      }
    }
    if (h < 0) h += 360

    const s = max === 0 ? 0 : (delta / max) * 100
    const v = max * 100

    return { h, s, v, a }
  }

  private hsvaToHex(hsva: { h: number, s: number, v: number, a: number }): string {
    const rgb = this.hsvToRgb(hsva.h, hsva.s, hsva.v)
    const r = Math.round(rgb.r).toString(16).padStart(2, '0')
    const g = Math.round(rgb.g).toString(16).padStart(2, '0')
    const b = Math.round(rgb.b).toString(16).padStart(2, '0')
    const a = Math.round(hsva.a * 255).toString(16).padStart(2, '0')
    return hsva.a < 1 ? `#${r}${g}${b}${a}` : `#${r}${g}${b}`
  }

  private hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    const sNorm = s / 100
    const vNorm = v / 100
    const c = vNorm * sNorm
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = vNorm - c

    let r = 0
    let g = 0
    let b = 0
    if (h >= 0 && h < 60) {
      r = c
      g = x
      b = 0
    } else if (h >= 60 && h < 120) {
      r = x
      g = c
      b = 0
    } else if (h >= 120 && h < 180) {
      r = 0
      g = c
      b = x
    } else if (h >= 180 && h < 240) {
      r = 0
      g = x
      b = c
    } else if (h >= 240 && h < 300) {
      r = x
      g = 0
      b = c
    } else {
      r = c
      g = 0
      b = x
    }

    return {
      r: (r + m) * 255,
      g: (g + m) * 255,
      b: (b + m) * 255,
    }
  }

  changeColor(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const key = input.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    if (!key || !daisyColorKeys.includes(key)) {
      return
    }
    const value = input.value
    this.updateCustomTheme((theme) => ({
      ...theme,
      colors: { ...theme.colors, [key]: value },
    }))
  }

  selectPresetColor(event: Event) {
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
    const value = target.dataset.settingsPresetValue
    if (!key || !daisyColorKeys.includes(key) || !value) {
      return
    }
    const hsva = this.hexToHsva(value)
    this.colorPickerState.set(key, hsva)
    this.updateColorFromHsva(key, hsva)
  }

  selectRadius(event: Event) {
    const target = event.currentTarget as HTMLElement
    const field = target.dataset.settingsRadiusField as 'radiusBox' | 'radiusField' | 'radiusSelector' | undefined
    const value = target.dataset.settingsRadiusValue
    if (!field || !isRadiusValue(value)) {
      return
    }
    this.updateCustomTheme((theme) => ({ ...theme, [field]: value }))
  }

  selectSize(event: Event) {
    const target = event.currentTarget as HTMLElement
    const field = target.dataset.settingsSizeField as 'sizeField' | 'sizeSelector' | undefined
    const value = target.dataset.settingsSizeValue
    if (!field || !isSizeValue(value)) {
      return
    }
    this.updateCustomTheme((theme) => ({ ...theme, [field]: value }))
  }

  selectBorder(event: Event) {
    const target = event.currentTarget as HTMLElement
    const value = target.dataset.settingsBorderValue
    if (!isBorderWidthValue(value)) {
      return
    }
    this.updateCustomTheme((theme) => ({ ...theme, borderWidth: value }))
  }

  toggleDepth(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    this.updateCustomTheme((theme) => ({ ...theme, depth: target.checked }))
  }

  toggleNoise(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    this.updateCustomTheme((theme) => ({ ...theme, noise: target.checked }))
  }

  resetCustomTheme() {
    const config = readStoredLayoutConfig()
    persistLayoutConfig({ ...config, customTheme: { ...lightThemeDefaults } })
    applyCustomTheme(lightThemeDefaults)
    this.syncCustomTheme(lightThemeDefaults)
  }

  async copyConfig() {
    if (!this.hasCopyButtonTarget) {
      return
    }
    const config = readStoredLayoutConfig()
    const snippet = renderPresetSnippet(config)
    try {
      await navigator.clipboard.writeText(snippet)
      this.flashCopyLabel('已复制!')
    } catch {
      this.flashCopyLabel('复制失败')
    }
  }

  private flashCopyLabel(text: string) {
    if (!this.hasCopyLabelTarget) {
      return
    }
    const original = this.copyLabelTarget.textContent ?? '复制配置到 layout/config.ts'
    this.copyLabelTarget.textContent = text
    if (this.copyResetTimer) {
      window.clearTimeout(this.copyResetTimer)
    }
    this.copyResetTimer = window.setTimeout(() => {
      this.copyLabelTarget.textContent = original
    }, 1500)
  }

  private updateCustomTheme(updater: (theme: DaisyTheme) => DaisyTheme) {
    const config = readStoredLayoutConfig()
    const customTheme = sanitizeCustomTheme(updater(config.customTheme))
    persistLayoutConfig({ ...config, customTheme })
    applyCustomTheme(customTheme)
    this.syncCustomTheme(customTheme)
  }

  private sync() {
    const config = readStoredLayoutConfig()
    this.syncThemeOptions(config.theme)
    this.syncVariantOptions(config.variant)
    if (this.hasSidebarCollapsedTarget) {
      this.sidebarCollapsedTarget.checked = config.sidebarCollapsed
    }
    this.syncCustomTheme(config.customTheme)
    applyCustomTheme(config.customTheme)
  }

  private syncThemeOptions(theme: ThemeName) {
    for (const option of this.themeOptionTargets) {
      const selected = option.dataset.settingsThemeValue === theme
      option.setAttribute('aria-pressed', selected ? 'true' : 'false')
      option.classList.toggle('btn-primary', selected)
      option.classList.toggle('btn-ghost', !selected)
      option.classList.toggle('border', !selected)
      option.classList.toggle('border-base-300', !selected)
    }
    for (const check of this.themeCheckTargets) {
      check.classList.toggle('hidden', check.dataset.settingsThemeValue !== theme)
    }
  }

  private syncVariantOptions(variant: LayoutVariant) {
    for (const option of this.variantOptionTargets) {
      const selected = option.dataset.settingsVariantValue === variant
      option.setAttribute('aria-pressed', selected ? 'true' : 'false')
      option.classList.toggle('border-primary', selected)
      option.classList.toggle('ring-2', selected)
      option.classList.toggle('ring-primary/30', selected)
      option.classList.toggle('border-base-300', !selected)
    }
    for (const check of this.variantCheckTargets) {
      check.classList.toggle('hidden', check.dataset.settingsVariantValue !== variant)
    }
  }

  private syncCustomTheme(theme: DaisyTheme) {
    for (const swatch of this.colorSwatchTargets) {
      const key = swatch.dataset.settingsColorKey as keyof DaisyColorPalette | undefined
      if (key && daisyColorKeys.includes(key)) {
        swatch.style.backgroundColor = theme.colors[key]
      }
    }
    for (const option of this.radiusOptionTargets) {
      const field = option.dataset.settingsRadiusField as 'radiusBox' | 'radiusField' | 'radiusSelector' | undefined
      const value = option.dataset.settingsRadiusValue as RadiusValue | undefined
      if (!field || !value) {
        continue
      }
      const selected = theme[field] === value
      option.classList.toggle('border-primary', selected)
      option.classList.toggle('bg-primary', selected)
      option.classList.toggle('text-primary-content', selected)
      option.classList.toggle('border-base-300', !selected)
    }
    for (const option of this.sizeOptionTargets) {
      const field = option.dataset.settingsSizeField as 'sizeField' | 'sizeSelector' | undefined
      const value = option.dataset.settingsSizeValue as SizeValue | undefined
      if (!field || !value) {
        continue
      }
      const selected = theme[field] === value
      option.classList.toggle('border-primary', selected)
      option.classList.toggle('bg-primary', selected)
      option.classList.toggle('text-primary-content', selected)
      option.classList.toggle('border-base-300', !selected)
    }
    for (const option of this.borderOptionTargets) {
      const value = option.dataset.settingsBorderValue as BorderWidthValue | undefined
      if (!value) {
        continue
      }
      const selected = theme.borderWidth === value
      option.classList.toggle('border-primary', selected)
      option.classList.toggle('bg-primary', selected)
      option.classList.toggle('text-primary-content', selected)
      option.classList.toggle('border-base-300', !selected)
    }
    if (this.hasDepthToggleTarget) {
      this.depthToggleTarget.checked = theme.depth
    }
    if (this.hasNoiseToggleTarget) {
      this.noiseToggleTarget.checked = theme.noise
    }
  }

  private applyTheme(theme: ThemeName) {
    const root = document.documentElement
    const resolvedTheme = resolveTheme(theme)
    if (root.getAttribute('data-theme') === resolvedTheme) {
      return
    }

    root.dataset.themeSwitching = 'true'
    root.setAttribute('data-theme', resolvedTheme)

    cancelAnimationFrame(this.themeSwitchFrame)
    this.themeSwitchFrame = requestAnimationFrame(() => {
      this.themeSwitchFrame = requestAnimationFrame(() => {
        delete root.dataset.themeSwitching
      })
    })
  }

  private handleSystemThemeChange = () => {
    if (readStoredLayoutConfig().theme === 'system') {
      this.applyTheme('system')
    }
  }
}

function readStoredLayoutConfig(): LayoutConfig {
  try {
    const value = localStorage.getItem(layoutConfigStorageKey)
    const parsed = value ? JSON.parse(value) as Partial<LayoutConfig> : {}

    return {
      sidebarCollapsed: typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : defaultLayoutConfig.sidebarCollapsed,
      theme: isThemeName(parsed.theme)
        ? parsed.theme
        : defaultLayoutConfig.theme,
      variant: isLayoutVariant(parsed.variant)
        ? parsed.variant
        : defaultLayoutConfig.variant,
      customTheme: sanitizeCustomTheme(parsed.customTheme),
    }
  } catch {
    return { ...defaultLayoutConfig, customTheme: { ...defaultLayoutConfig.customTheme } }
  }
}

function persistLayoutConfig(config: LayoutConfig) {
  try {
    localStorage.setItem(layoutConfigStorageKey, JSON.stringify(config))
  } catch {}
}

function writeVariantCookie(variant: LayoutVariant) {
  document.cookie = `${layoutVariantCookieName}=${variant}; path=/; max-age=31536000; samesite=lax`
}

function resolveTheme(theme: ThemeName): DaisyThemeName {
  if (theme !== 'system') {
    return theme
  }
  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
}

function getPopoverToggleState(event: Event): 'open' | 'closed' | null {
  const state = (event as Event & { newState?: unknown }).newState
  return state === 'open' || state === 'closed' ? state : null
}

function isColorPopoverOpen(popover: HTMLElement): boolean {
  if (popover.hasAttribute('data-settings-popover-open')) {
    return true
  }
  try {
    return popover.matches(':popover-open')
  } catch {
    return false
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function applyCustomTheme(theme: DaisyTheme) {
  let styleEl = document.getElementById(customThemeStyleId) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = customThemeStyleId
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = buildCustomThemeCss(theme)
}

function renderPresetSnippet(config: LayoutConfig): string {
  const preset = {
    defaultTheme: config.theme,
    variant: config.variant,
    customTheme: config.customTheme,
  }
  void layoutPreset
  const json = JSON.stringify(preset, null, 2)
  const tsLiteral = json
    .replace(/"([A-Z_$][\w$-]*)":/gi, (_match, key: string) =>
      (/^[A-Z_$][\w$]*$/i).test(key) ? `${key}:` : `'${key}':`)
    .replace(/"/g, '\'')
  return `export const layoutPreset: LayoutPreset = ${tsLiteral}\n`
}
