export type Surface = 'admin' | 'user'

export function getSurfaceLoginPath(surface: Surface): string {
  return surface === 'admin' ? '/admin/login' : '/user/login'
}

export function isAdminSurface(surface: Surface): boolean {
  return surface === 'admin'
}
