import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useSessionStore } from '../../stores/session'
import {
  createMenuOptions,
  createRootMenuOptions,
  getActivePath,
  getExpandableMenuKeys,
  getExpandedMenuKeys,
  getLogoText,
} from './helpers'

/** 由菜单树与当前激活项派生侧栏/顶栏/移动端菜单、面包屑和展开键,从 AppLayout 抽出。 */
export function useLayoutMenus(options: {
  hybridLayout: ComputedRef<boolean>
  visibleActiveMenuName: ComputedRef<string>
}) {
  const { hybridLayout, visibleActiveMenuName } = options
  const { menus, siteTitle } = storeToRefs(useSessionStore())
  const menuExpandedKeys = ref<Array<string | number>>([])

  const activePath = computed(() => getActivePath(menus.value, visibleActiveMenuName.value) ?? [])
  const activeRoot = computed(() => activePath.value[0] ?? menus.value[0])
  const breadcrumbs = computed(() => activePath.value.map((item) => ({
    href: item.href,
    label: item.label,
    name: item.name,
  })))
  const expandableMenuKeys = computed(() => new Set(getExpandableMenuKeys(menus.value)))
  const logoText = computed(() => getLogoText(siteTitle.value))
  const menuOptions = computed(() => createMenuOptions(menus.value))
  const rootMenuOptions = computed(() => createRootMenuOptions(menus.value))
  const activeChildrenMenus = computed(() => {
    const root = activeRoot.value
    if (!root) {
      return []
    }

    return root.children?.length ? root.children : [root]
  })
  const sidebarMenuOptions = computed(() =>
    hybridLayout.value ? createMenuOptions(activeChildrenMenus.value) : menuOptions.value,
  )
  const mobileSidebarMenuOptions = computed(() =>
    hybridLayout.value ? menuOptions.value : undefined,
  )
  const mobileMenuOptions = computed(() => mobileSidebarMenuOptions.value ?? menuOptions.value)
  const topMenuOptions = computed(() =>
    hybridLayout.value ? rootMenuOptions.value : menuOptions.value,
  )
  // 顶栏菜单:hybrid 顶部只放一级菜单,选中键用一级(root);top-nav 顶部是完整菜单树,
  // 选中键必须用当前叶子,下拉里的子菜单项才会高亮当前页。
  const topSelectedMenuKey = computed(() =>
    hybridLayout.value
      ? (activeRoot.value?.name ?? visibleActiveMenuName.value)
      : visibleActiveMenuName.value,
  )

  watch(
    () => [menus.value, visibleActiveMenuName.value] as const,
    () => {
      const validKeys = expandableMenuKeys.value
      const nextKeys = new Set(menuExpandedKeys.value.filter((key) => validKeys.has(key)))
      for (const key of getExpandedMenuKeys(menus.value, visibleActiveMenuName.value, activePath.value)) {
        nextKeys.add(key)
      }
      menuExpandedKeys.value = [...nextKeys]
    },
    { immediate: true },
  )

  return {
    breadcrumbs,
    logoText,
    menuExpandedKeys,
    mobileMenuOptions,
    sidebarMenuOptions,
    topMenuOptions,
    topSelectedMenuKey,
  }
}
