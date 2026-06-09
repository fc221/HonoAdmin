export function hasField<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key)
}

export function createPlaceholders(values: unknown[]): string {
  return values.map(() => '?').join(', ')
}

export function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return Number.isInteger(mb) ? `${mb}MB` : `${bytes} bytes`
}
