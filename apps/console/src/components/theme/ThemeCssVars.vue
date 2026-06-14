<script setup lang="ts">
import { useThemeVars } from 'naive-ui'
import { watchEffect } from 'vue'

// 把 Naive 合并后的 common 主题变量(default + themeOverrides)镜像到 :root。
// <NElement> 只把这些变量挂在包裹 app 的那个 div 上,teleport 到 body 的弹层
// (modal/drawer/popover/message)在它外面,取不到变量;镜像到 :root 后,
// @theme inline 桥出来的工具类(bg-base-100 / text-large / shadow-naive...)在弹层里也成立。
// 注意:必须在 <NConfigProvider> 内部调用 useThemeVars(),否则拿不到 themeOverrides。
const themeVars = useThemeVars()

// 复刻 lodash-es kebabCase(NElement 用它生成变量名):
// bodyColor -> body-color、primaryColorHover -> primary-color-hover、boxShadow1 -> box-shadow-1
function toKebab(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])(\d)/gi, '$1-$2')
    .toLowerCase()
}

watchEffect(() => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const vars = themeVars.value
  for (const key in vars) {
    const value = vars[key as keyof typeof vars]
    if (typeof value === 'string') {
      root.style.setProperty(`--${toKebab(key)}`, value)
    }
  }
})
</script>

<template>
  <slot />
</template>
