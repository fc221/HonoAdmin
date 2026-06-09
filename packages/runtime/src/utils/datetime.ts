export const defaultTimezone = 'Asia/Shanghai'

export function normalizeTimezone(value: string | undefined): string {
  const timezoneValue = value?.trim() || defaultTimezone

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezoneValue })
    return timezoneValue
  } catch {
    return defaultTimezone
  }
}
