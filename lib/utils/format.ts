/**
 * Formatting utilities for dates, times, and numbers
 * Note: These functions should only be called on client-side to avoid hydration mismatch
 * due to timezone/locale differences between server and client
 */

// Use fixed locale and timezone options to ensure consistency
const LOCALE_OPTIONS = {
  locale: 'vi-VN',
  timeZone: 'Asia/Ho_Chi_Minh' // Fixed timezone to avoid mismatch
} as const

export const formatTime = (date: Date): string => {
  if (typeof window === 'undefined') return '--:--'
  return date.toLocaleTimeString(LOCALE_OPTIONS.locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: LOCALE_OPTIONS.timeZone
  })
}

export const formatTimeOnly = (value: string | Date): string => {
  if (typeof window === 'undefined') return '--:--:--'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleTimeString(LOCALE_OPTIONS.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: LOCALE_OPTIONS.timeZone
  })
}

export const formatDate = (date: Date): string => {
  if (typeof window === 'undefined') return ''
  return date.toLocaleDateString(LOCALE_OPTIONS.locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: LOCALE_OPTIONS.timeZone
  })
}

export const formatDateDetailed = (date: Date): { weekday: string; day: string; month: string; year: string } => {
  if (typeof window === 'undefined') {
    return { weekday: '', day: '', month: '', year: '' }
  }

  const weekday = date.toLocaleDateString(LOCALE_OPTIONS.locale, {
    weekday: 'long',
    timeZone: LOCALE_OPTIONS.timeZone
  })

  const day = date.toLocaleDateString(LOCALE_OPTIONS.locale, {
    day: '2-digit',
    timeZone: LOCALE_OPTIONS.timeZone
  })

  const month = date.toLocaleDateString(LOCALE_OPTIONS.locale, {
    month: 'long',
    timeZone: LOCALE_OPTIONS.timeZone
  })

  const year = date.toLocaleDateString(LOCALE_OPTIONS.locale, {
    year: 'numeric',
    timeZone: LOCALE_OPTIONS.timeZone
  })

  return { weekday, day, month, year }
}

export const formatDateTime = (value: string | Date): string => {
  if (typeof window === 'undefined') return '--'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString(LOCALE_OPTIONS.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: LOCALE_OPTIONS.timeZone
  })
}

export const formatTotalHours = (totalHours: number | string | null | undefined): string => {
  if (totalHours == null) return '0h'
  const num = typeof totalHours === 'string' ? parseFloat(totalHours) : totalHours
  if (Number.isNaN(num)) return '0h'
  return `${num.toFixed(2)}h`
}

export const formatHours = (value?: number): string => {
  if (value == null) return '0h'
  return `${Number(value).toFixed(1)}h`
}

export const formatTotalHoursAsDateTime = (totalHours: number | string | null | undefined): string => {
  if (totalHours == null) return '0s'
  const num = typeof totalHours === 'string' ? parseFloat(totalHours) : totalHours
  if (Number.isNaN(num) || num < 0) return '0s'
  if (num === 0) return '0s'

  // Convert hours to total seconds for accurate calculation
  // Use Math.round instead of Math.floor to preserve accuracy for short durations
  const totalSeconds = Math.round(num * 3600)

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  // Format as "Xh Ym Zs"
  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`)
  }

  if (seconds > 0) {
    parts.push(`${seconds}s`)
  }

  // If all are 0, show "0s"
  if (parts.length === 0) {
    return '0s'
  }

  return parts.join(' ')
}

