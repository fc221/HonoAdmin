// 用主入口而不是 dayjs/esm:后者内部是无扩展名相对导入,打包器能解析,服务端 ESM 运行时解析不了。
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

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

export interface DayBucket {
  end: number
  label: string
  start: number
}

/**
 * 最近 days 天的日边界(含今天),按给定时区切分,不是按 UTC。
 * 用于「近 N 天」这类按天聚合:边界在这里算好,SQL 只做区间计数,跨方言无需日期函数。
 */
export function getRecentDayBuckets(
  now: number,
  timezoneValue: string,
  days: number,
): DayBucket[] {
  setDefaultTimezone(normalizeTimezone(timezoneValue))
  const today = dayjs(now).tz().startOf('day')

  return Array.from({ length: days }, (_, index) => {
    const start = today.subtract(days - 1 - index, 'day')
    return {
      end: start.add(1, 'day').valueOf(),
      label: start.format('MM-DD'),
      start: start.valueOf(),
    }
  })
}
