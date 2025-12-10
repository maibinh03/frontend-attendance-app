export interface AttendanceLike {
  checkInTime: string | null
  checkOutTime: string | null
  workDate: string
  totalHours?: number | null
}

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = 1000 * 60 * 60 * 24

const toDateOnly = (value: string | null): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const calculateSessionHours = (attendance: AttendanceLike): number => {
  const { checkInTime, checkOutTime, totalHours } = attendance

  if (checkInTime && checkOutTime) {
    const start = new Date(checkInTime).getTime()
    const end = new Date(checkOutTime).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      return (end - start) / MS_PER_HOUR
    }
  }

  if (typeof totalHours === 'number' && totalHours > 0) {
    return totalHours
  }

  return 0
}

const calculateStreakDays = (attendances: AttendanceLike[]): number => {
  const dates = attendances
    .filter((item) => item.checkInTime)
    .map((item) => toDateOnly(item.workDate))
    .filter((d): d is Date => Boolean(d))

  if (!dates.length) return 0

  const uniqueDates = Array.from(
    new Map(dates.map((date) => [date.getTime(), date])).values()
  ).sort((a, b) => b.getTime() - a.getTime())

  let streak = 1

  for (let i = 1; i < uniqueDates.length; i += 1) {
    const diffDays = Math.round((uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / MS_PER_DAY)
    if (diffDays === 1) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

export const calculateAttendanceStats = (attendances: AttendanceLike[]): { streakDays: number; totalHours: number; level: number } => {
  const totalHours = attendances.reduce((sum, record) => sum + calculateSessionHours(record), 0)
  const roundedTotalHours = Math.round(totalHours * 100) / 100
  const level = Math.floor(roundedTotalHours)
  const streakDays = calculateStreakDays(attendances)

  return {
    streakDays,
    totalHours: roundedTotalHours,
    level
  }
}
