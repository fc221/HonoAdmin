export interface MenuItem {
  children?: MenuItem[]
  defaultOpen?: boolean
  href?: string
  icon: string
  label: string
  name: string
}

export interface MenuBreadcrumbItem {
  href?: string
  label: string
  name: string
}

export const adminMenus: MenuItem[] = [
  {
    href: '/admin/dashboard',
    icon: 'icon-[ri--dashboard-line]',
    label: '仪表盘',
    name: 'admin.dashboard',
  },
  {
    icon: 'icon-[ri--window-line]',
    label: '网站管理',
    name: 'admin.web',
    children: [
      {
        href: '/admin/web/page',
        icon: 'icon-[ri--pages-line]',
        label: '页面管理',
        name: 'admin.web.page',
      },
      {
        href: '/admin/web/notification',
        icon: 'icon-[ri--notification-2-line]',
        label: '公告管理',
        name: 'admin.web.notification',
      },
      {
        href: '/admin/web/feedback',
        icon: 'icon-[ri--feedback-line]',
        label: '用户反馈',
        name: 'admin.web.feedback',
      },
    ],
  },
  {
    defaultOpen: true,
    icon: 'icon-[ri--settings-4-line]',
    label: '系统管理',
    name: 'admin.system',
    children: [
      {
        href: '/admin/system/config',
        icon: 'icon-[ri--settings-3-line]',
        label: '配置管理',
        name: 'admin.system.config',
      },
      {
        href: '/admin/system/user',
        icon: 'icon-[ri--user-settings-line]',
        label: '用户管理',
        name: 'admin.system.user',
      },
      {
        href: '/admin/system/role',
        icon: 'icon-[ri--shield-user-line]',
        label: '角色管理',
        name: 'admin.system.role',
      },
      {
        href: '/admin/system/file',
        icon: 'icon-[ri--folder-image-line]',
        label: '文件管理',
        name: 'admin.system.file',
      },
      {
        href: '/admin/system/operate-log',
        icon: 'icon-[ri--file-list-2-line]',
        label: '操作日志',
        name: 'admin.system.operate-log',
      },
      {
        href: '/admin/system/update',
        icon: 'icon-[ri--refresh-line]',
        label: '更新管理',
        name: 'admin.system.update',
      },
    ],
  },
]

export const userMenus: MenuItem[] = [
  {
    href: '/user/dashboard',
    icon: 'icon-[ri--dashboard-line]',
    label: '仪表盘',
    name: 'user.dashboard',
  },
  {
    href: '/user/profile',
    icon: 'icon-[ri--map-pin-user-line]',
    label: '个人中心',
    name: 'user.profile',
  },
]

export const defaultMenus: MenuItem[] = [
  ...adminMenus,
  ...userMenus,
]
