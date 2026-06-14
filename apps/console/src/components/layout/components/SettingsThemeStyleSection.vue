<script setup lang="ts">
import type {
  NaiveThemeColorKey,
  NaiveThemeDraft,
  NaiveThemeMode,
  NaiveThemeRadius,
  NaiveThemeSize,
} from '../../theme/naive-theme'
import { NButton, NColorPicker, NInput, NSwitch } from 'naive-ui'
import { computed } from 'vue'
import AppIcon from '../../AppIcon.vue'
import {
  createNaiveThemeDraft,
  hasNaiveDraftDepth,
  naiveRadiusScale,
  naiveSizeScale,
  setNaiveDraftDepth,
} from '../../theme/naive-theme'
import {
  colorGroups,
  colorPickerModes,
  presetColors,
  radiusLabels,
  sizeLabels,
} from './settings-theme-style-options'

type CommonRadiusKey = 'borderRadius' | 'borderRadiusSmall'
type CommonSizeKey = 'heightLarge' | 'heightMedium' | 'heightSmall'
type ComponentRadiusTarget = 'DataTable' | 'Menu'

const props = defineProps<{
  mode: NaiveThemeMode
}>()

const draft = defineModel<NaiveThemeDraft>('draft', { required: true })
const depthEnabled = computed({
  get: () => hasNaiveDraftDepth(draft.value),
  set: value => updateDraft(setNaiveDraftDepth(draft.value, value)),
})

function resetThemeDraft(): void {
  updateDraft(createNaiveThemeDraft(props.mode))
}

function updateDraft(nextDraft: NaiveThemeDraft): void {
  draft.value = nextDraft
}

function updateThemeName(value: string): void {
  updateDraft({
    ...draft.value,
    name: value.trim() || props.mode,
  })
}

function updateColor(key: NaiveThemeColorKey, value: string | null): void {
  if (!value) {
    return
  }

  updateDraft({
    ...draft.value,
    common: {
      ...draft.value.common,
      [key]: value,
    },
  })
}

function updateCommonRadius(key: CommonRadiusKey, value: NaiveThemeRadius): void {
  updateDraft({
    ...draft.value,
    common: {
      ...draft.value.common,
      [key]: value,
    },
  })
}

function updateComponentRadius(target: ComponentRadiusTarget, value: NaiveThemeRadius): void {
  updateDraft({
    ...draft.value,
    [target]: {
      ...draft.value[target],
      borderRadius: value,
    },
  })
}

function updateCommonSize(key: CommonSizeKey, value: NaiveThemeSize): void {
  updateDraft({
    ...draft.value,
    common: {
      ...draft.value.common,
      [key]: value,
    },
  })
}
</script>

<template>
  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      Name
    </h3>
    <div class="flex justify-center">
      <NInput
        class="max-w-40 text-center"
        :input-props="{ 'aria-label': '主题名称' }"
        placeholder="主题Name"
        size="small"
        :value="draft.name"
        @update:value="updateThemeName"
      />
    </div>
  </section>

  <section>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-base-content">
        配色
      </h3>
      <NButton quaternary size="tiny" @click="resetThemeDraft">
        <template #icon>
          <AppIcon name="ri:refresh-line" />
        </template>
        重置
      </NButton>
    </div>
    <div class="space-y-4">
      <div v-for="group in colorGroups" :key="group.title">
        <div class="mb-2 text-xs text-base-muted">
          {{ group.title }}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="pair in group.pairs"
            :key="pair.key"
            class="grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 border border-base-border rounded-naive-sm px-2 py-1.5"
          >
            <span class="truncate text-xs text-base-content">{{ pair.label }}</span>
            <NColorPicker
              :value="draft.common[pair.key]"
              :modes="colorPickerModes"
              size="small"
              :show-alpha="true"
              :show-preview="true"
              :swatches="presetColors"
              @update:value="value => updateColor(pair.key, value)"
            >
              <template #trigger="{ onClick, ref: setTriggerRef }">
                <button
                  :ref="setTriggerRef"
                  type="button"
                  class="grid size-7 place-items-center rounded-full ring-1 ring-base-border transition hover:scale-105"
                  :style="{ background: draft.common[pair.key] }"
                  :title="pair.label"
                  @click="onClick"
                >
                  <span class="sr-only">{{ pair.label }}</span>
                </button>
              </template>
            </NColorPicker>
          </label>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      圆角
    </h3>
    <div class="space-y-2">
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Box</span>
        <div class="grid grid-cols-6 gap-1">
          <NButton
            v-for="(value, index) in naiveRadiusScale"
            :key="value"
            size="tiny"
            :type="draft.common.borderRadius === value ? 'primary' : 'default'"
            @click="updateCommonRadius('borderRadius', value)"
          >
            {{ radiusLabels[index] }}
          </NButton>
        </div>
      </div>
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Field</span>
        <div class="grid grid-cols-6 gap-1">
          <NButton
            v-for="(value, index) in naiveRadiusScale"
            :key="value"
            size="tiny"
            :type="draft.common.borderRadiusSmall === value ? 'primary' : 'default'"
            @click="updateCommonRadius('borderRadiusSmall', value)"
          >
            {{ radiusLabels[index] }}
          </NButton>
        </div>
      </div>
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Table</span>
        <div class="grid grid-cols-6 gap-1">
          <NButton
            v-for="(value, index) in naiveRadiusScale"
            :key="value"
            size="tiny"
            :type="draft.DataTable.borderRadius === value ? 'primary' : 'default'"
            @click="updateComponentRadius('DataTable', value)"
          >
            {{ radiusLabels[index] }}
          </NButton>
        </div>
      </div>
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Menu</span>
        <div class="grid grid-cols-6 gap-1">
          <NButton
            v-for="(value, index) in naiveRadiusScale"
            :key="value"
            size="tiny"
            :type="draft.Menu.borderRadius === value ? 'primary' : 'default'"
            @click="updateComponentRadius('Menu', value)"
          >
            {{ radiusLabels[index] }}
          </NButton>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      尺寸
    </h3>
    <div class="space-y-2">
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Small</span>
        <div class="grid grid-cols-5 gap-1">
          <NButton
            v-for="(value, index) in naiveSizeScale"
            :key="value"
            size="tiny"
            :type="draft.common.heightSmall === value ? 'primary' : 'default'"
            @click="updateCommonSize('heightSmall', value)"
          >
            {{ sizeLabels[index] }}
          </NButton>
        </div>
      </div>
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Medium</span>
        <div class="grid grid-cols-5 gap-1">
          <NButton
            v-for="(value, index) in naiveSizeScale"
            :key="value"
            size="tiny"
            :type="draft.common.heightMedium === value ? 'primary' : 'default'"
            @click="updateCommonSize('heightMedium', value)"
          >
            {{ sizeLabels[index] }}
          </NButton>
        </div>
      </div>
      <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
        <span class="text-xs text-base-muted">Large</span>
        <div class="grid grid-cols-5 gap-1">
          <NButton
            v-for="(value, index) in naiveSizeScale"
            :key="value"
            size="tiny"
            :type="draft.common.heightLarge === value ? 'primary' : 'default'"
            @click="updateCommonSize('heightLarge', value)"
          >
            {{ sizeLabels[index] }}
          </NButton>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      效果
    </h3>
    <label
      class="flex cursor-pointer items-center justify-between border border-base-border rounded-naive p-3"
    >
      <span class="text-sm font-medium text-base-content">Depth</span>
      <NSwitch v-model:value="depthEnabled" />
    </label>
  </section>
</template>
