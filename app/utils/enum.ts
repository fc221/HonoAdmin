export type EnumTone = 'error' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

export interface EnumOption<V extends string | number> {
  label: string
  tone?: EnumTone
  value: V
}

export interface EnumUtils<V extends string | number> {
  description: string
  getBadgeClass: (value: V) => string
  getLabel: (value: V) => string
  getOptions: () => EnumOption<V>[]
  getTone: (value: V) => EnumTone
  getValues: () => V[]
  map: Record<V, string>
}

export function wrapEnum<
  E extends Record<string, V>,
  V extends string | number,
>(
  enumObject: E,
  enumMap: Record<V, string>,
  tones: Partial<Record<V, EnumTone>> = {},
): EnumUtils<V> {
  const values = Object.values(enumObject) as V[]

  return {
    description: values
      .map((value) => `\`${String(value)}\`: ${enumMap[value]}`)
      .join('\n'),
    getBadgeClass: (value) => getEnumBadgeClass(tones[value] ?? 'neutral'),
    getLabel: (value) => enumMap[value] ?? String(value),
    getOptions: () => values.map((value) => ({
      label: enumMap[value] ?? String(value),
      tone: tones[value],
      value,
    })),
    getTone: (value) => tones[value] ?? 'neutral',
    getValues: () => [...values],
    map: enumMap,
  }
}

export function getEnumBadgeClass(tone: EnumTone): string {
  const toneClassMap: Record<EnumTone, string> = {
    error: 'badge-error',
    info: 'badge-info',
    neutral: 'badge-neutral',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
  }

  return toneClassMap[tone]
}
