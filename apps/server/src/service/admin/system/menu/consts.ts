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

export const adminMenus: MenuItem[] = [
  {
    href: '/admin/dashboard',
    icon: 'dashboard',
    label: '仪表盘',
    name: 'admin.dashboard',
    routePath: '/admin/dashboard',
    component: 'admin/dashboard',
  },
  {
    icon: 'web',
    label: '网站管理',
    name: 'admin.web',
    children: [
      {
        href: '/admin/web/page',
        icon: 'page',
        label: '页面管理',
        name: 'admin.web.page',
        routePath: '/admin/web/page',
        component: 'admin/web/page',
      },
      {
        href: '/admin/web/notification',
        icon: 'notification',
        label: '公告管理',
        name: 'admin.web.notification',
        routePath: '/admin/web/notification',
        component: 'admin/web/notification',
      },
      {
        href: '/admin/web/feedback',
        icon: 'feedback',
        label: '用户反馈',
        name: 'admin.web.feedback',
        routePath: '/admin/web/feedback',
        component: 'admin/web/feedback',
      },
    ],
  },
  {
    defaultOpen: true,
    icon: 'settings',
    label: '系统管理',
    name: 'admin.system',
    children: [
      {
        href: '/admin/system/config',
        icon: 'config',
        label: '配置管理',
        name: 'admin.system.config',
        routePath: '/admin/system/config',
        component: 'admin/system/config',
      },
      {
        href: '/admin/system/user',
        icon: 'user-settings',
        label: '用户管理',
        name: 'admin.system.user',
        routePath: '/admin/system/user',
        component: 'admin/system/user',
      },
      {
        href: '/admin/system/role',
        icon: 'role',
        label: '角色管理',
        name: 'admin.system.role',
        routePath: '/admin/system/role',
        component: 'admin/system/role',
      },
      {
        href: '/admin/system/file',
        icon: 'file',
        label: '文件管理',
        name: 'admin.system.file',
        routePath: '/admin/system/file',
        component: 'admin/system/file',
      },
      {
        href: '/admin/system/operate-log',
        icon: 'operate-log',
        label: '操作日志',
        name: 'admin.system.operate-log',
        routePath: '/admin/system/operate-log',
        component: 'admin/system/operate-log',
      },
      {
        href: '/admin/system/update',
        icon: 'update',
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
    icon: 'dashboard',
    label: '仪表盘',
    name: 'user.dashboard',
    routePath: '/user/dashboard',
    component: 'user/dashboard',
  },
  {
    href: '/user/profile',
    icon: 'profile',
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
