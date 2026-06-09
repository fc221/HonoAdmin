export interface AvatarTextSource {
  nickname?: string | null
  username?: string | null
}

export function getAvatarText(
  source: AvatarTextSource | string | null | undefined,
): string {
  const value = typeof source === 'string'
    ? source
    : source?.username || source?.nickname
  const normalizedValue = value?.trim() || '用户'

  return ([...normalizedValue][0] ?? '用').toUpperCase()
}
