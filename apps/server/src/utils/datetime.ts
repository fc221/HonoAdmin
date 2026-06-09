import dayjs from 'dayjs/esm'
import timezone from 'dayjs/esm/plugin/timezone'
import utc from 'dayjs/esm/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export const defaultTimezone = 'Asia/Shanghai'
export const dateTimeDisplayFormat = 'YYYY-MM-DD HH:mm:ss'

export function normalizeTimezone(value: string | undefined): string {
  const timezoneValue = value?.trim() || defaultTimezone

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezoneValue })
    return timezoneValue
  } catch {
    return defaultTimezone
  }
}

export function setDefaultTimezone(value: string | undefined): string {
  const timezoneValue = normalizeTimezone(value)
  dayjs.tz.setDefault(timezoneValue)
  return timezoneValue
}

export function formatDateTime(
  value: number | string | null | undefined,
  timezoneValue: string,
  format = dateTimeDisplayFormat,
): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const date = dayjs(value)
  if (!date.isValid()) {
    return String(value)
  }

  setDefaultTimezone(timezoneValue)
  return date.tz().format(format)
}
