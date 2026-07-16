export interface MenuItem {
  children?: MenuItem[]
  component?: string
  defaultOpen?: boolean
  href?: string
  icon: string
  label: string
  name: string
  routePath?: string
}

export interface MenuBreadcrumbItem {
  href?: string
  label: string
  name: string
}

/** 展平菜单树。菜单是唯一注册点:权限映射、前端资源 URL、路由都从它推导,共用这个遍历。 */
export function flattenMenuItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [item, ...flattenMenuItems(item.children ?? [])])
}

export const adminMenus: MenuItem[] = [
  {
    href: '/admin/dashboard',
    icon: 'ri:apps-line',
    label: '仪表盘',
    name: 'admin.dashboard',
    routePath: '/admin/dashboard',
    component: 'admin/dashboard',
  },
  {
    icon: 'ri:global-line',
    label: '网站管理',
    name: 'admin.web',
    children: [
      {
        href: '/admin/web/page',
        icon: 'ri:file-text-line',
        label: '页面管理',
        name: 'admin.web.page',
        routePath: '/admin/web/page',
      },
      {
        href: '/admin/web/notification',
        icon: 'ri:notification-3-line',
        label: '公告管理',
        name: 'admin.web.notification',
        routePath: '/admin/web/notification',
      },
      {
        href: '/admin/web/feedback',
        icon: 'ri:chat-3-line',
        label: '用户反馈',
        name: 'admin.web.feedback',
        routePath: '/admin/web/feedback',
      },
    ],
  },
  {
    defaultOpen: true,
    icon: 'ri:settings-3-line',
    label: '系统管理',
    name: 'admin.system',
    children: [
      {
        href: '/admin/system/config',
        icon: 'ri:settings-3-line',
        label: '配置管理',
        name: 'admin.system.config',
        routePath: '/admin/system/config',
        component: 'admin/system/config',
      },
      {
        href: '/admin/system/user',
        icon: 'ri:user-settings-line',
        label: '用户管理',
        name: 'admin.system.user',
        routePath: '/admin/system/user',
        component: 'admin/system/user',
      },
      {
        href: '/admin/system/role',
        icon: 'ri:shield-check-line',
        label: '角色管理',
        name: 'admin.system.role',
        routePath: '/admin/system/role',
      },
      {
        href: '/admin/system/file',
        icon: 'ri:image-line',
        label: '文件管理',
        name: 'admin.system.file',
        routePath: '/admin/system/file',
        component: 'admin/system/file',
      },
      {
        href: '/admin/system/operate-log',
        icon: 'ri:list-check-2',
        label: '操作日志',
        name: 'admin.system.operate-log',
        routePath: '/admin/system/operate-log',
      },
      {
        href: '/admin/system/cron',
        icon: 'ri:timer-line',
        label: '定时任务',
        name: 'admin.system.cron',
        routePath: '/admin/system/cron',
        component: 'admin/system/cron',
      },
      {
        href: '/admin/system/update',
        icon: 'ri:refresh-line',
        label: '更新管理',
        name: 'admin.system.update',
        routePath: '/admin/system/update',
        component: 'admin/system/update',
      },
    ],
  },
]

export const userMenus: MenuItem[] = [
  {
    href: '/user/dashboard',
    icon: 'ri:apps-line',
    label: '仪表盘',
    name: 'user.dashboard',
    routePath: '/user/dashboard',
    component: 'user/dashboard',
  },
  {
    href: '/user/profile',
    icon: 'ri:account-circle-line',
    label: '个人中心',
    name: 'user.profile',
    routePath: '/user/profile',
    component: 'user/profile',
  },
]

export const defaultMenus: MenuItem[] = [
  ...adminMenus,
  ...userMenus,
]
