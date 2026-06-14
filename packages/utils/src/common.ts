export function hasField<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key)
}

export function createPlaceholders(values: unknown[]): string {
  return values.map(() => '?').join(', ')
}

/**
 * 人类可读的字节大小:整数单位不带小数(`6 MB`),否则保留 1 位(`1.5 KB`)。
 * 前端展示文件大小、后端拼限额提示文案共用。
 */
export function formatFileSize(bytes: unknown): string {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) {
    return '-'
  }
  if (value < 1024) {
    return `${value} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${Number.isInteger(size) ? size : size.toFixed(1)} ${units[unitIndex]}`
}
