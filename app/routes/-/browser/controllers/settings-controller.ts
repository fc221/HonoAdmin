import type {
  DaisyThemeName,
  LayoutConfig,
  LayoutVariant,
  ThemeName,
} from '../../components/layout/config'
import type {
  BorderWidthValue,
  DaisyColorPalette,
  DaisyThemeDraft,
  RadiusValue,
  SizeValue,
} from '../../components/layout/theme-css'
import { Controller } from '@hotwired/stimulus'
import {
  defaultLayoutConfig,
  isDaisyThemeName,
  isLayoutMainWidth,
  isLayoutVariant,
  isThemeName,
  isTopNavVariant,
  layoutConfigStorageKey,
  layoutVariantCookieName,
  systemThemeName,
  systemThemeQuery,
} from '../../components/layout/config'
import {
  buildDaisyThemeCss,
  cloneDaisyThemeDraft,
  daisyColorKeys,
  defaultDaisyThemeDraft,
  isBorderWidthValue,
  isRadiusValue,
  isSizeValue,
  sanitizeDaisyThemeDraft,
} from '../../components/layout/theme-css'

const drawerAnimationDuration = 220
const themeChangedEventName = 'hono-admin:theme-changed'

export default class SettingsController extends Controller<HTMLElement> {
  static targets = [
    'overlay',
    'panel',
    'themeOption',
    'themeCheck',
    'themeName',
    'themeSelect',
    'variantOption',
    'variantCheck',
    'mainWidthToggle',
    'sidebarOnlyControl',
    'sidebarCollapsed',
    'topMenuCentered',
    'topNavOnlyControl',
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
  ]

  declare readonly overlayTarget: HTMLElement
  declare readonly panelTarget: HTMLElement
  declare readonly themeOptionTargets: HTMLElement[]
  declare readonly themeCheckTargets: HTMLElement[]
  declare readonly themeNameTargets: HTMLInputElement[]
  declare readonly themeSelectTargets: HTMLSelectElement[]
  declare readonly variantOptionTargets: HTMLElement[]
  declare readonly variantCheckTargets: HTMLElement[]
  declare readonly mainWidthToggleTarget: HTMLInputElement
  declare readonly hasMainWidthToggleTarget: boolean
  declare readonly sidebarOnlyControlTargets: HTMLElement[]
  declare readonly sidebarCollapsedTarget: HTMLInputElement
  declare readonly hasSidebarCollapsedTarget: boolean
  declare readonly topMenuCenteredTarget: HTMLInputElement
  declare readonly hasTopMenuCenteredTarget: boolean
  declare readonly topNavOnlyControlTargets: HTMLElement[]
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

  private mediaQuery: MediaQueryList | null = null
  private themeSwitchFrame = 0
  private copyResetTimer = 0
  private colorPopoverFrame = 0
  private drawerAnimationFrame = 0
  private drawerCloseTimer = 0
  private themeDraft = cloneDaisyThemeDraft(defaultDaisyThemeDraft)
  private colorPickerState = new Map<string, { h: number, s: number, v: number, a: number }>()

  connect() {
    this.mediaQuery = window.matchMedia(systemThemeQuery)
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
    window.addEventListener(themeChangedEventName, this.handleThemeChanged)
    window.addEventListener('resize', this.scheduleOpenColorPopoverPositions)
    window.addEventListener('scroll', this.scheduleOpenColorPopoverPositions, true)
    this.sync()
  }

  disconnect() {
    this.mediaQuery?.removeEventListener('change', this.handleSystemThemeChange)
    window.removeEventListener(themeChangedEventName, this.handleThemeChanged)
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
    const theme = getThemeValueFromTarget(target)
    const config = readStoredLayoutConfig()
    if (!isThemeName(theme)) {
      this.syncThemeOptions(config.theme)
      return
    }

    persistLayoutConfig({ ...config, theme })
    this.updateThemeDraft((draft) => ({ ...draft, name: toDaisyThemeName(theme) }))
    this.applyTheme(theme)
    this.syncThemeOptions(theme)
    window.dispatchEvent(new CustomEvent(themeChangedEventName, { detail: { theme } }))
    hideClosestPopover(target)
  }

  updateThemeDraftName(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const name = target.value.trim()
    if (!isDaisyThemeName(name)) {
      this.syncThemeDraft(this.themeDraft)
      return
    }

    this.updateThemeDraft((draft) => ({ ...draft, name }))
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

  toggleMainWidth(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const config = readStoredLayoutConfig()
    if (!isTopNavVariant(config.variant)) {
      target.checked = config.mainWidth === 'narrow'
      return
    }

    const mainWidth = target.checked ? 'narrow' : 'wide'
    persistLayoutConfig({ ...config, mainWidth })
    document.documentElement.dataset.layoutMainWidth = mainWidth
  }

  toggleSidebarCollapsed(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const config = readStoredLayoutConfig()
    if (isTopNavVariant(config.variant)) {
      target.checked = config.sidebarCollapsed
      return
    }

    persistLayoutConfig({ ...config, sidebarCollapsed: target.checked })
    document.documentElement.dataset.sidebarCollapsed = target.checked ? 'true' : 'false'
  }

  toggleTopMenuCentered(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const config = readStoredLayoutConfig()
    if (!isTopNavVariant(config.variant)) {
      target.checked = config.topMenuCentered
      return
    }

    persistLayoutConfig({ ...config, topMenuCentered: target.checked })
    document.documentElement.dataset.layoutTopMenuCentered = target.checked ? 'true' : 'false'
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

    const hsva = this.colorToHsva(this.getColorPickerSourceColor(key))
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
      const width = Math.max(rect.width, 1)
      const height = Math.max(rect.height, 1)
      const x = Math.max(0, Math.min(e.clientX - rect.left, width))
      const y = Math.max(0, Math.min(e.clientY - rect.top, height))
      const s = (x / width) * 100
      const v = 100 - (y / height) * 100

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
      const width = Math.max(rect.width, 1)
      const x = Math.max(0, Math.min(e.clientX - rect.left, width))
      const h = (x / width) * 360

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
      const width = Math.max(rect.width, 1)
      const x = Math.max(0, Math.min(e.clientX - rect.left, width))
      const a = x / width

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
    if (!hsva) {
      return
    }
    this.colorPickerState.set(key, hsva)
    this.updateColorFromHsva(key, hsva)
  }

  private updateColorFromHsva(key: keyof DaisyColorPalette, hsva: { h: number, s: number, v: number, a: number }) {
    const nextHsva = normalizeHsva(hsva)
    const hex = this.hsvaToHex(nextHsva)
    this.updateThemeDraft((theme) => ({
      ...theme,
      colors: { ...theme.colors, [key]: hex },
    }))
    this.updateColorPickerUI(key, nextHsva)
  }

  private updateColorPickerUI(key: keyof DaisyColorPalette, hsva: { h: number, s: number, v: number, a: number }) {
    const nextHsva = normalizeHsva(hsva)
    const saturationHandle = this.saturationHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const hueHandle = this.hueHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const alphaHandle = this.alphaHandleTargets.find((el) => el.dataset.settingsColorKey === key)
    const alphaGradient = this.alphaGradientTargets.find((el) => el.dataset.settingsColorKey === key)
    const hexInput = this.hexInputTargets.find((el) => el.dataset.settingsColorKey === key)
    const saturationPicker = this.saturationPickerTargets.find((el) => el.dataset.settingsColorKey === key)

    if (saturationHandle) {
      saturationHandle.style.left = `${nextHsva.s}%`
      saturationHandle.style.top = `${100 - nextHsva.v}%`
    }

    if (hueHandle) {
      hueHandle.style.left = `${(nextHsva.h / 360) * 100}%`
    }

    if (alphaHandle) {
      alphaHandle.style.left = `${nextHsva.a * 100}%`
    }

    const baseColor = this.hsvToRgb(nextHsva.h, 100, 100)
    if (saturationPicker) {
      saturationPicker.style.background = `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b}))`
    }

    const rgb = this.hsvToRgb(nextHsva.h, nextHsva.s, nextHsva.v)
    if (alphaGradient) {
      alphaGradient.style.background = `linear-gradient(to right, transparent, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`
    }

    if (hexInput) {
      hexInput.value = this.hsvaToHex(nextHsva)
    }
  }

  private getColorPickerSourceColor(key: keyof DaisyColorPalette): string {
    const swatch = this.colorSwatchTargets.find((target) => target.dataset.settingsColorKey === key)
    const swatchColor = swatch ? getComputedStyle(swatch).backgroundColor : ''
    if (swatchColor && swatchColor !== 'rgba(0, 0, 0, 0)' && swatchColor !== 'transparent') {
      return swatchColor
    }

    return this.themeDraft.colors[key]
  }

  private colorToHsva(color: string): { h: number, s: number, v: number, a: number } {
    const value = color.trim()
    return normalizeHsva(
      this.hexToHsva(value)
      ?? this.rgbCssToHsva(value)
      ?? this.oklchToHsva(value)
      ?? { h: 0, s: 0, v: 100, a: 1 },
    )
  }

  private hexToHsva(hex: string): { h: number, s: number, v: number, a: number } | null {
    const rgba = parseHexColor(hex)
    if (!rgba) {
      return null
    }

    return this.rgbToHsva(rgba.r, rgba.g, rgba.b, rgba.a)
  }

  private rgbCssToHsva(color: string): { h: number, s: number, v: number, a: number } | null {
    const rgba = parseRgbColor(color)
    if (!rgba) {
      return null
    }

    return this.rgbToHsva(rgba.r, rgba.g, rgba.b, rgba.a)
  }

  private oklchToHsva(color: string): { h: number, s: number, v: number, a: number } | null {
    const rgba = parseOklchColor(color)
    if (!rgba) {
      return null
    }

    return this.rgbToHsva(rgba.r, rgba.g, rgba.b, rgba.a)
  }

  private rgbToHsva(rValue: number, gValue: number, bValue: number, aValue = 1): { h: number, s: number, v: number, a: number } {
    const r = clamp(rValue, 0, 255) / 255
    const g = clamp(gValue, 0, 255) / 255
    const b = clamp(bValue, 0, 255) / 255
    const a = clamp(aValue, 0, 1)

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
    const nextHsva = normalizeHsva(hsva)
    const rgb = this.hsvToRgb(nextHsva.h, nextHsva.s, nextHsva.v)
    const r = toHexByte(rgb.r)
    const g = toHexByte(rgb.g)
    const b = toHexByte(rgb.b)
    const a = toHexByte(nextHsva.a * 255)
    return nextHsva.a < 1 ? `#${r}${g}${b}${a}` : `#${r}${g}${b}`
  }

  private hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    const hNorm = normalizeHue(h)
    const sNorm = clamp(s, 0, 100) / 100
    const vNorm = clamp(v, 0, 100) / 100
    const c = vNorm * sNorm
    const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1))
    const m = vNorm - c

    let r = 0
    let g = 0
    let b = 0
    if (hNorm >= 0 && hNorm < 60) {
      r = c
      g = x
      b = 0
    } else if (hNorm >= 60 && hNorm < 120) {
      r = x
      g = c
      b = 0
    } else if (hNorm >= 120 && hNorm < 180) {
      r = 0
      g = c
      b = x
    } else if (hNorm >= 180 && hNorm < 240) {
      r = 0
      g = x
      b = c
    } else if (hNorm >= 240 && hNorm < 300) {
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
    this.updateThemeDraft((theme) => ({
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
    if (!hsva) {
      return
    }
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
    this.updateThemeDraft((theme) => ({ ...theme, [field]: value }))
  }

  selectSize(event: Event) {
    const target = event.currentTarget as HTMLElement
    const field = target.dataset.settingsSizeField as 'sizeField' | 'sizeSelector' | undefined
    const value = target.dataset.settingsSizeValue
    if (!field || !isSizeValue(value)) {
      return
    }
    this.updateThemeDraft((theme) => ({ ...theme, [field]: value }))
  }

  selectBorder(event: Event) {
    const target = event.currentTarget as HTMLElement
    const value = target.dataset.settingsBorderValue
    if (!isBorderWidthValue(value)) {
      return
    }
    this.updateThemeDraft((theme) => ({ ...theme, borderWidth: value }))
  }

  toggleDepth(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    this.updateThemeDraft((theme) => ({ ...theme, depth: target.checked }))
  }

  toggleNoise(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    this.updateThemeDraft((theme) => ({ ...theme, noise: target.checked }))
  }

  resetThemeDraft() {
    this.themeDraft = cloneDaisyThemeDraft({
      ...defaultDaisyThemeDraft,
      name: toDaisyThemeName(readStoredLayoutConfig().theme),
    })
    this.syncThemeDraft(this.themeDraft)
  }

  async copyThemeCss(event: Event) {
    this.themeDraft = sanitizeDaisyThemeDraft({
      ...this.themeDraft,
      name: this.readDaisyThemeNameFromInput(),
    })

    try {
      await writeClipboardText(buildDaisyThemeCss(this.themeDraft))
      this.flashCopyLabel(event.currentTarget as HTMLElement, '已复制!')
    } catch {
      this.flashCopyLabel(event.currentTarget as HTMLElement, '复制失败')
    }
  }

  async copyLayoutConfig(event: Event) {
    const config = readStoredLayoutConfig()
    try {
      await writeClipboardText(renderLayoutConfigSnippet(config))
      this.flashCopyLabel(event.currentTarget as HTMLElement, '已复制!')
    } catch {
      this.flashCopyLabel(event.currentTarget as HTMLElement, '复制失败')
    }
  }

  private flashCopyLabel(button: HTMLElement, text: string) {
    const label = button.querySelector<HTMLElement>('[data-settings-copy-label]')
    if (!label) {
      return
    }

    const original = label.dataset.settingsCopyDefault || label.textContent || ''
    label.dataset.settingsCopyDefault = original
    label.textContent = text
    if (this.copyResetTimer) {
      window.clearTimeout(this.copyResetTimer)
    }
    this.copyResetTimer = window.setTimeout(() => {
      label.textContent = original
    }, 1500)
  }

  private updateThemeDraft(updater: (theme: DaisyThemeDraft) => DaisyThemeDraft) {
    this.themeDraft = sanitizeDaisyThemeDraft(updater(cloneDaisyThemeDraft(this.themeDraft)))
    this.syncThemeDraft(this.themeDraft)
  }

  private sync() {
    const config = readStoredLayoutConfig()
    this.syncThemeOptions(config.theme)
    this.syncVariantOptions(config.variant)
    if (this.hasSidebarCollapsedTarget) {
      this.sidebarCollapsedTarget.checked = config.sidebarCollapsed
    }
    if (this.hasMainWidthToggleTarget) {
      this.mainWidthToggleTarget.checked = config.mainWidth === 'narrow'
    }
    if (this.hasTopMenuCenteredTarget) {
      this.topMenuCenteredTarget.checked = config.topMenuCentered
    }
    this.themeDraft = sanitizeDaisyThemeDraft({
      ...this.themeDraft,
      name: toDaisyThemeName(config.theme),
    })
    this.syncThemeDraft(this.themeDraft)
  }

  private syncThemeOptions(theme: ThemeName) {
    for (const option of this.themeOptionTargets) {
      const selected = option.dataset.settingsThemeValue === theme
      option.setAttribute('aria-pressed', selected ? 'true' : 'false')
      option.classList.toggle('menu-active', selected)
      if (option.classList.contains('btn')) {
        option.classList.toggle('btn-primary', selected)
        option.classList.toggle('btn-ghost', !selected)
        option.classList.toggle('border', !selected)
        option.classList.toggle('border-base-300', !selected)
      }
    }
    for (const check of this.themeCheckTargets) {
      check.classList.toggle('hidden', check.dataset.settingsThemeValue !== theme)
    }
    for (const select of this.themeSelectTargets) {
      select.value = theme
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
    const topNavSelected = isTopNavVariant(variant)
    if (this.hasSidebarCollapsedTarget) {
      this.sidebarCollapsedTarget.disabled = topNavSelected
    }
    for (const control of this.sidebarOnlyControlTargets) {
      control.classList.toggle('opacity-50', topNavSelected)
      control.classList.toggle('cursor-not-allowed', topNavSelected)
      control.classList.toggle('cursor-pointer', !topNavSelected)
    }
    if (this.hasMainWidthToggleTarget) {
      this.mainWidthToggleTarget.disabled = !topNavSelected
    }
    if (this.hasTopMenuCenteredTarget) {
      this.topMenuCenteredTarget.disabled = !topNavSelected
    }
    for (const control of this.topNavOnlyControlTargets) {
      control.classList.toggle('opacity-50', !topNavSelected)
    }
  }

  private syncThemeDraft(theme: DaisyThemeDraft) {
    for (const input of this.themeNameTargets) {
      input.value = theme.name
    }
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

  private readDaisyThemeNameFromInput(): DaisyThemeName {
    const value = this.themeNameTargets[0]?.value.trim()
    return isDaisyThemeName(value) ? value : this.themeDraft.name
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
    if (readStoredLayoutConfig().theme === systemThemeName) {
      this.applyTheme(systemThemeName)
    }
  }

  private handleThemeChanged = (event: Event) => {
    const theme = (event as CustomEvent<{ theme?: unknown }>).detail?.theme
    if (!isThemeName(theme)) {
      return
    }

    this.applyTheme(theme)
    this.syncThemeOptions(theme)
    this.updateThemeDraft((draft) => ({ ...draft, name: toDaisyThemeName(theme) }))
  }
}

function getThemeValueFromTarget(target: HTMLElement): unknown {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
    return target.value.trim()
  }

  return target.dataset.settingsThemeValue
}

function hideClosestPopover(target: HTMLElement) {
  const popover = target.closest<HTMLElement & { hidePopover?: () => void }>(
    '[popover]',
  )
  popover?.hidePopover?.()
}

function readStoredLayoutConfig(): LayoutConfig {
  try {
    const value = localStorage.getItem(layoutConfigStorageKey)
    const parsed = value ? JSON.parse(value) as Partial<LayoutConfig> : {}

    return {
      mainWidth: isLayoutMainWidth(parsed.mainWidth)
        ? parsed.mainWidth
        : defaultLayoutConfig.mainWidth,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : defaultLayoutConfig.sidebarCollapsed,
      theme: isThemeName(parsed.theme)
        ? parsed.theme
        : defaultLayoutConfig.theme,
      topMenuCentered: typeof parsed.topMenuCentered === 'boolean'
        ? parsed.topMenuCentered
        : defaultLayoutConfig.topMenuCentered,
      variant: isLayoutVariant(parsed.variant)
        ? parsed.variant
        : defaultLayoutConfig.variant,
    }
  } catch {
    return { ...defaultLayoutConfig }
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
  if (theme !== systemThemeName) {
    return theme
  }
  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
}

function toDaisyThemeName(theme: ThemeName): DaisyThemeName {
  return theme === systemThemeName ? defaultDaisyThemeDraft.name : theme
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
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function parseHexColor(color: string): { r: number, g: number, b: number, a: number } | null {
  const match = color.trim().match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)
  if (!match) {
    return null
  }

  const value = match[1]
  const expanded = value.length === 3 || value.length === 4
    ? value.split('').map((part) => part + part).join('')
    : value

  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1

  if (![r, g, b, a].every(Number.isFinite)) {
    return null
  }

  return { r, g, b, a }
}

function parseRgbColor(color: string): { r: number, g: number, b: number, a: number } | null {
  const match = color.trim().match(/^rgba?\((.*)\)$/i)
  if (!match) {
    return null
  }

  const [channelsPart, slashAlpha] = match[1].split('/').map((part) => part.trim())
  const channels = channelsPart.replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  if (channels.length < 3) {
    return null
  }

  const r = parseRgbChannel(channels[0])
  const g = parseRgbChannel(channels[1])
  const b = parseRgbChannel(channels[2])
  const a = parseAlphaValue(slashAlpha || channels[3] || '1')

  if (![r, g, b, a].every(Number.isFinite)) {
    return null
  }

  return { r, g, b, a }
}

function parseOklchColor(color: string): { r: number, g: number, b: number, a: number } | null {
  const match = color.trim().match(/^oklch\((.*)\)$/i)
  if (!match) {
    return null
  }

  const [channelsPart, slashAlpha] = match[1].split('/').map((part) => part.trim())
  const channels = channelsPart.split(/\s+/).filter(Boolean)
  if (channels.length < 3) {
    return null
  }

  const l = channels[0].endsWith('%')
    ? Number.parseFloat(channels[0]) / 100
    : Number.parseFloat(channels[0])
  const c = Number.parseFloat(channels[1])
  const h = channels[2] === 'none' ? 0 : Number.parseFloat(channels[2])
  const a = parseAlphaValue(slashAlpha || '1')

  if (![l, c, h, a].every(Number.isFinite)) {
    return null
  }

  return oklchToRgb(l, c, h, a)
}

function parseRgbChannel(value: string): number {
  if (value.endsWith('%')) {
    return clamp((Number.parseFloat(value) / 100) * 255, 0, 255)
  }

  return clamp(Number.parseFloat(value), 0, 255)
}

function parseAlphaValue(value: string): number {
  if (value.endsWith('%')) {
    return clamp(Number.parseFloat(value) / 100, 0, 1)
  }

  return clamp(Number.parseFloat(value), 0, 1)
}

function oklchToRgb(l: number, c: number, h: number, a: number): { r: number, g: number, b: number, a: number } {
  const hueRadians = (h * Math.PI) / 180
  const labA = c * Math.cos(hueRadians)
  const labB = c * Math.sin(hueRadians)

  const lPrime = l + 0.3963377774 * labA + 0.2158037573 * labB
  const mPrime = l - 0.1055613458 * labA - 0.0638541728 * labB
  const sPrime = l - 0.0894841775 * labA - 1.2914855480 * labB

  const lCubed = lPrime ** 3
  const mCubed = mPrime ** 3
  const sCubed = sPrime ** 3

  const rLinear = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.7076147010 * sCubed

  return {
    r: linearSrgbToByte(rLinear),
    g: linearSrgbToByte(gLinear),
    b: linearSrgbToByte(bLinear),
    a,
  }
}

function linearSrgbToByte(value: number): number {
  const srgb = value <= 0.0031308
    ? 12.92 * value
    : 1.055 * (value ** (1 / 2.4)) - 0.055
  return clamp(srgb * 255, 0, 255)
}

function normalizeHsva(hsva: { h: number, s: number, v: number, a: number }): { h: number, s: number, v: number, a: number } {
  return {
    h: normalizeHue(hsva.h),
    s: clamp(hsva.s, 0, 100),
    v: clamp(hsva.v, 0, 100),
    a: clamp(hsva.a, 0, 1),
  }
}

function normalizeHue(hue: number): number {
  if (!Number.isFinite(hue)) {
    return 0
  }
  return ((hue % 360) + 360) % 360
}

function toHexByte(value: number): string {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {}

  if (copyTextWithTextarea(text)) {
    return
  }

  throw new Error('Clipboard copy failed')
}

function copyTextWithTextarea(text: string): boolean {
  const activeElement = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    textarea.remove()
    if (activeElement instanceof HTMLElement) {
      activeElement.focus()
    }
  }

  return copied
}

function renderLayoutConfigSnippet(config: LayoutConfig): string {
  return [
    'export const layoutPreset: LayoutPreset = {',
    `  defaultTheme: ${quoteTsString(config.theme)},`,
    `  mainWidth: ${quoteTsString(config.mainWidth)},`,
    `  sidebarCollapsed: ${config.sidebarCollapsed ? 'true' : 'false'},`,
    `  topMenuCentered: ${config.topMenuCentered ? 'true' : 'false'},`,
    `  variant: ${quoteTsString(config.variant)},`,
    '}',
    '',
  ].join('\n')
}

function quoteTsString(value: string): string {
  return JSON.stringify(value)
}
