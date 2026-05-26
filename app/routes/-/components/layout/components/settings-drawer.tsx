import type {
  BorderWidthValue,
  DaisyColorPalette,
  LayoutVariant,
  RadiusValue,
  SizeValue,
  ThemeName,
} from '../config'
import {
  borderWidthScale,
  defaultLayoutConfig,
  layoutPreset,
  radiusScale,
  sizeScale,
} from '../config'

const themeOptions: Array<{
  label: string
  value: ThemeName
  icon: string
}> = [
  { label: '系统', value: 'system', icon: 'icon-[ri--computer-line]' },
  { label: '亮色', value: 'light', icon: 'icon-[ri--sun-line]' },
  { label: '暗色', value: 'dark', icon: 'icon-[ri--moon-clear-line]' },
  { label: '纯黑', value: 'black', icon: 'icon-[ri--contrast-2-line]' },
]

const radiusLabels = ['0', '0.25', '0.5', '1', '2']
const sizeLabels = ['XS', 'S', 'M', 'L', 'XL']

const variantOptions: Array<{
  label: string
  value: LayoutVariant
  preview: () => unknown
}> = [
  {
    label: '侧边栏',
    value: 'sidebar',
    preview: () => <VariantPreview kind="sidebar" />,
  },
  {
    label: '侧边栏贴边',
    value: 'sidebar-flush',
    preview: () => <VariantPreview kind="sidebar-flush" />,
  },
  {
    label: '顶部导航',
    value: 'top-nav',
    preview: () => <VariantPreview kind="top-nav" />,
  },
  {
    label: '顶部贴边',
    value: 'top-nav-flush',
    preview: () => <VariantPreview kind="top-nav-flush" />,
  },
]

const colorGroups: Array<{
  title: string
  pairs: Array<{ key: keyof DaisyColorPalette, label: string, contentKey?: keyof DaisyColorPalette }>
}> = [
  {
    title: '品牌',
    pairs: [
      { key: 'primary', label: 'Primary', contentKey: 'primary-content' },
      { key: 'secondary', label: 'Secondary', contentKey: 'secondary-content' },
      { key: 'accent', label: 'Accent', contentKey: 'accent-content' },
      { key: 'neutral', label: 'Neutral', contentKey: 'neutral-content' },
    ],
  },
  {
    title: '基础',
    pairs: [
      { key: 'base-100', label: 'Base 100' },
      { key: 'base-200', label: 'Base 200' },
      { key: 'base-300', label: 'Base 300' },
      { key: 'base-content', label: 'Base Content' },
    ],
  },
  {
    title: '状态',
    pairs: [
      { key: 'info', label: 'Info', contentKey: 'info-content' },
      { key: 'success', label: 'Success', contentKey: 'success-content' },
      { key: 'warning', label: 'Warning', contentKey: 'warning-content' },
      { key: 'error', label: 'Error', contentKey: 'error-content' },
    ],
  },
]

interface Props {
  triggerClass?: string
}

export default function SettingsDrawer({ triggerClass }: Props = {}) {
  const selectedTheme = defaultLayoutConfig.theme
  const selectedVariant = layoutPreset.variant
  const defaultCollapsed = defaultLayoutConfig.sidebarCollapsed
  const customTheme = layoutPreset.customTheme
  const isDev = import.meta.env.DEV

  return (
    <div data-controller="settings">
      <button
        type="button"
        class={triggerClass ?? 'btn btn-sm btn-ghost btn-circle opacity-80'}
        aria-label="打开设置面板"
        data-action="settings#open"
        title="设置"
      >
        <i class="icon-[ri--settings-3-line] text-sm"></i>
      </button>
      <div
        data-settings-target="overlay"
        class="fixed inset-0 z-[100] hidden bg-black/40 opacity-0 transition-opacity duration-200 ease-out"
        data-action="click->settings#close"
      >
      </div>
      <aside
        data-settings-target="panel"
        class="fixed inset-y-0 right-0 z-[101] hidden w-96 max-w-[95vw] translate-x-full flex-col bg-base-100 opacity-0 shadow-xl transition-[transform,opacity] duration-200 ease-out"
        aria-label="界面设置"
        role="dialog"
      >
        <header class="flex items-center justify-between border-b border-base-200 px-4 py-3">
          <h2 class="text-base font-semibold">界面设置</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="关闭设置"
            data-action="settings#close"
          >
            <i class="icon-[ri--close-line]"></i>
          </button>
        </header>
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">主题</h3>
            <div class="grid grid-cols-2 gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selectedTheme === option.value}
                  class={`btn btn-sm justify-start gap-2 ${
                    selectedTheme === option.value ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                  data-action="settings#selectTheme"
                  data-settings-target="themeOption"
                  data-settings-theme-value={option.value}
                >
                  <i class={option.icon}></i>
                  <span class="flex-1 text-left">{option.label}</span>
                  <i
                    class={`icon-[ri--check-line] ${selectedTheme === option.value ? '' : 'hidden'}`}
                    data-settings-target="themeCheck"
                    data-settings-theme-value={option.value}
                  >
                  </i>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">布局变体</h3>
            <div class="grid grid-cols-2 gap-3">
              {variantOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selectedVariant === option.value}
                  class={`group flex flex-col items-stretch gap-2 rounded-box border p-2 transition hover:border-primary ${
                    selectedVariant === option.value
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-base-300'
                  }`}
                  data-action="settings#selectVariant"
                  data-settings-target="variantOption"
                  data-settings-variant-value={option.value}
                >
                  {option.preview()}
                  <span class="flex items-center justify-between text-xs">
                    <span>{option.label}</span>
                    <i
                      class={`icon-[ri--check-line] text-primary ${
                        selectedVariant === option.value ? '' : 'hidden'
                      }`}
                      data-settings-target="variantCheck"
                      data-settings-variant-value={option.value}
                    >
                    </i>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">界面偏好</h3>
            <label class="flex cursor-pointer items-center justify-between rounded-box border border-base-300 p-3">
              <span class="flex flex-col">
                <span class="text-sm font-medium">默认折叠侧边栏</span>
                <span class="text-xs text-base-content/60">仅作用于含侧边栏的布局</span>
              </span>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                checked={defaultCollapsed}
                data-action="change->settings#toggleSidebarCollapsed"
                data-settings-target="sidebarCollapsed"
              />
            </label>
          </section>
          <section>
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-base-content/80">配色</h3>
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                data-action="settings#resetCustomTheme"
              >
                <i class="icon-[ri--refresh-line]"></i>
                <span>重置</span>
              </button>
            </div>
            <div class="space-y-4">
              {colorGroups.map((group) => (
                <div key={group.title}>
                  <div class="mb-2 text-xs text-base-content/60">{group.title}</div>
                  <div class="grid grid-cols-2 gap-2">
                    {group.pairs.map((pair) => (
                      <ColorRow
                        key={pair.key}
                        colorKey={pair.key}
                        contentKey={pair.contentKey}
                        label={pair.label}
                        value={customTheme.colors[pair.key]}
                        contentValue={pair.contentKey ? customTheme.colors[pair.contentKey] : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">圆角</h3>
            <RadiusRow
              label="Box"
              field="radiusBox"
              value={customTheme.radiusBox}
            />
            <RadiusRow
              label="Field"
              field="radiusField"
              value={customTheme.radiusField}
            />
            <RadiusRow
              label="Selector"
              field="radiusSelector"
              value={customTheme.radiusSelector}
            />
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">尺寸</h3>
            <SizeRow
              label="Field"
              field="sizeField"
              value={customTheme.sizeField}
            />
            <SizeRow
              label="Selector"
              field="sizeSelector"
              value={customTheme.sizeSelector}
            />
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">边框宽度</h3>
            <BorderRow value={customTheme.borderWidth} />
          </section>
          <section>
            <h3 class="mb-3 text-sm font-semibold text-base-content/80">效果</h3>
            <div class="space-y-2">
              <label class="flex cursor-pointer items-center justify-between rounded-box border border-base-300 p-3">
                <span class="text-sm font-medium">Depth</span>
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  checked={customTheme.depth}
                  data-action="change->settings#toggleDepth"
                  data-settings-target="depthToggle"
                />
              </label>
              <label class="flex cursor-pointer items-center justify-between rounded-box border border-base-300 p-3">
                <span class="text-sm font-medium">Noise</span>
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  checked={customTheme.noise}
                  data-action="change->settings#toggleNoise"
                  data-settings-target="noiseToggle"
                />
              </label>
            </div>
          </section>
        </div>
        <footer class="border-t border-base-200 px-4 py-3 space-y-2">
          <p class="text-xs text-base-content/60">
            切换布局会刷新当前页面以应用更新。
          </p>
          {isDev
            ? (
                <button
                  type="button"
                  class="btn btn-block btn-sm btn-outline"
                  data-action="settings#copyConfig"
                  data-settings-target="copyButton"
                >
                  <i class="icon-[ri--clipboard-line]"></i>
                  <span data-settings-target="copyLabel">复制配置到 layout/config.ts</span>
                </button>
              )
            : null}
        </footer>
      </aside>
    </div>
  )
}

function ColorRow({
  colorKey,
  contentKey,
  label,
  value,
  contentValue,
}: {
  colorKey: keyof DaisyColorPalette
  contentKey?: keyof DaisyColorPalette
  label: string
  value: string
  contentValue?: string
}) {
  return (
    <div class="flex items-center gap-2 rounded-box border border-base-300 px-2 py-1.5">
      <ColorPicker colorKey={colorKey} value={value} />
      {contentKey
        ? <ColorPicker colorKey={contentKey} value={contentValue ?? ''} />
        : null}
      <span class="flex-1 truncate text-xs">{label}</span>
    </div>
  )
}

const presetColors = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
]

function ColorPicker({
  colorKey,
  value,
}: {
  colorKey: keyof DaisyColorPalette
  value: string
}) {
  const popoverId = `color-popover-${colorKey}`

  return (
    <>
      <button
        type="button"
        popovertarget={popoverId}
        style={`background-color:${value}`}
        class="h-6 w-6 cursor-pointer rounded-full ring-1 ring-base-300 ring-offset-1 ring-offset-base-100 transition hover:ring-primary"
        title={`${colorKey}: ${value}`}
        data-settings-target="colorSwatch"
        data-settings-color-key={colorKey}
      />
      <div
        id={popoverId}
        popover="auto"
        style="position:fixed;inset:auto;margin:0;visibility:hidden"
        class="w-64 max-w-[calc(100vw-1.5rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl overflow-y-auto"
        data-settings-target="colorPopover"
        data-settings-color-key={colorKey}
        data-action="toggle->settings#initColorPicker"
      >
        <div class="space-y-3">
          {/* Saturation/Brightness Picker */}
          <div
            class="relative h-48 w-full cursor-crosshair overflow-hidden rounded"
            data-action="mousedown->settings#startSaturationPick"
            data-settings-target="saturationPicker"
            data-settings-color-key={colorKey}
            style="background: linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, hsl(0, 100%, 50%))"
          >
            <div
              class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none"
              data-settings-target="saturationHandle"
              data-settings-color-key={colorKey}
              style="left: 100%; top: 0%"
            />
          </div>

          {/* Hue Slider */}
          <div
            class="relative h-3 w-full cursor-pointer overflow-hidden rounded"
            style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
            data-action="mousedown->settings#startHuePick"
            data-settings-target="huePicker"
            data-settings-color-key={colorKey}
          >
            <div
              class="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-lg pointer-events-none"
              data-settings-target="hueHandle"
              data-settings-color-key={colorKey}
              style="left: 0%"
            />
          </div>

          {/* Alpha Slider */}
          <div
            class="relative h-3 w-full cursor-pointer overflow-hidden rounded"
            style="background-image: repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%); background-size: 8px 8px; background-position: 0 0"
            data-action="mousedown->settings#startAlphaPick"
            data-settings-target="alphaPicker"
            data-settings-color-key={colorKey}
          >
            <div
              class="absolute inset-0"
              data-settings-target="alphaGradient"
              data-settings-color-key={colorKey}
              style="background: linear-gradient(to right, transparent, #000)"
            />
            <div
              class="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-lg pointer-events-none z-10"
              data-settings-target="alphaHandle"
              data-settings-color-key={colorKey}
              style="left: 100%"
            />
          </div>

          {/* HEXA Input */}
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-base-content/70 w-12">HEXA</label>
            <input
              type="text"
              class="input input-sm input-bordered flex-1 font-mono text-xs"
              value={value}
              maxlength={9}
              data-settings-target="hexInput"
              data-settings-color-key={colorKey}
              data-action="input->settings#updateFromHex"
            />
          </div>

          {/* Preset Colors */}
          <div class="grid grid-cols-8 gap-1.5">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                class="aspect-square rounded border border-base-300 transition hover:scale-110 hover:border-primary"
                style={`background-color:${color}`}
                title={color}
                data-action="settings#selectPresetColor"
                data-settings-color-key={colorKey}
                data-settings-preset-value={color}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function RadiusRow({
  label,
  field,
  value,
}: {
  label: string
  field: 'radiusBox' | 'radiusField' | 'radiusSelector'
  value: RadiusValue
}) {
  return (
    <div class="mb-2 flex items-center gap-2">
      <span class="w-14 shrink-0 text-xs text-base-content/70">{label}</span>
      <div class="flex min-w-0 flex-1 gap-1">
        {radiusScale.map((scale, idx) => (
          <button
            key={scale}
            type="button"
            class={`min-w-0 flex-1 truncate rounded border px-1 py-1 text-[11px] ${
              value === scale ? 'border-primary bg-primary text-primary-content' : 'border-base-300'
            }`}
            title={scale}
            data-action="settings#selectRadius"
            data-settings-target="radiusOption"
            data-settings-radius-field={field}
            data-settings-radius-value={scale}
          >
            {radiusLabels[idx]}
          </button>
        ))}
      </div>
    </div>
  )
}

function SizeRow({
  label,
  field,
  value,
}: {
  label: string
  field: 'sizeField' | 'sizeSelector'
  value: SizeValue
}) {
  return (
    <div class="mb-2 flex items-center gap-2">
      <span class="w-14 shrink-0 text-xs text-base-content/70">{label}</span>
      <div class="flex min-w-0 flex-1 gap-1">
        {sizeScale.map((scale, idx) => (
          <button
            key={scale}
            type="button"
            class={`min-w-0 flex-1 truncate rounded border px-1 py-1 text-[11px] ${
              value === scale ? 'border-primary bg-primary text-primary-content' : 'border-base-300'
            }`}
            title={scale}
            data-action="settings#selectSize"
            data-settings-target="sizeOption"
            data-settings-size-field={field}
            data-settings-size-value={scale}
          >
            {sizeLabels[idx]}
          </button>
        ))}
      </div>
    </div>
  )
}

function BorderRow({ value }: { value: BorderWidthValue }) {
  return (
    <div class="flex min-w-0 flex-1 gap-1">
      {borderWidthScale.map((scale) => (
        <button
          key={scale}
          type="button"
          class={`min-w-0 flex-1 truncate rounded border px-1 py-1 text-[11px] ${
            value === scale ? 'border-primary bg-primary text-primary-content' : 'border-base-300'
          }`}
          title={scale}
          data-action="settings#selectBorder"
          data-settings-target="borderOption"
          data-settings-border-value={scale}
        >
          {scale}
        </button>
      ))}
    </div>
  )
}

function VariantPreview({ kind }: { kind: LayoutVariant }) {
  const wrap = 'aspect-[4/3] w-full rounded-md bg-base-200 p-1.5'

  if (kind === 'sidebar') {
    return (
      <div class={wrap}>
        <div class="flex h-full gap-1">
          <div class="w-1/3 rounded-sm bg-primary/70"></div>
          <div class="flex flex-1 flex-col gap-1">
            <div class="h-2 rounded-sm bg-base-100"></div>
            <div class="flex-1 rounded-sm bg-base-100"></div>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'sidebar-flush') {
    return (
      <div class="aspect-[4/3] w-full overflow-hidden rounded-md bg-base-200">
        <div class="flex h-full">
          <div class="w-1/3 bg-primary/70"></div>
          <div class="flex flex-1 flex-col">
            <div class="h-3 bg-base-100"></div>
            <div class="flex-1 bg-base-100/70"></div>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'top-nav') {
    return (
      <div class={wrap}>
        <div class="flex h-full flex-col gap-1">
          <div class="h-2 rounded-sm bg-primary/70"></div>
          <div class="flex-1 rounded-sm bg-base-100"></div>
        </div>
      </div>
    )
  }

  return (
    <div class="aspect-[4/3] w-full overflow-hidden rounded-md bg-base-200">
      <div class="flex h-full flex-col">
        <div class="h-3 bg-primary/70"></div>
        <div class="flex-1 bg-base-100/70"></div>
      </div>
    </div>
  )
}
