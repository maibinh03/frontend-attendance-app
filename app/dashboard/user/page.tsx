'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode
} from 'react'
import { useRouter } from 'next/navigation'
import DatePicker, { type DateRangeValue } from '@/components/date-picker'
import { USER_ROLES, authUtils } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { formatDate, formatDateDetailed, formatDateTime, formatTimeOnly, formatTotalHours, formatTotalHoursAsDateTime } from '@/lib/utils/format'
import { MESSAGE_TIMEOUT } from '@/lib/constants'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import '@/app/styles/user-dashboard.css'
import { calculateAttendanceStats } from '@/utils/attendanceStats'

export const dynamic = 'force-dynamic'

interface Attendance {
  id: number
  userId: number
  checkInTime: string
  checkOutTime: string | null
  workDate: string
  totalHours: number | null
  status: string
  notes: string | null
}

interface PeerUser {
  id: number
  username: string
  fullName?: string
  role?: string
  isSelf?: boolean
}

type MessageState = { type: 'success' | 'error'; text: string } | null

const HISTORY_PAGE_SIZE = 3
const formatElapsedDuration = (seconds: number): string => {
  const totalSeconds = Math.max(0, seconds)
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const padDatePart = (value: number): string => String(value).padStart(2, '0')

const safeDateFromString = (value: string): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const toDateInputString = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

const formatUserOptionLabel = (
  user: { fullName?: string; username?: string; id?: number; isSelf?: boolean },
  fallback: string
): string => {
  const baseName = user.fullName && user.username
    ? `${user.fullName} (${user.username})`
    : user.fullName || user.username || fallback
  return user.isSelf ? `${baseName} - người dùng hiện tại` : baseName
}

const HistoryRow = memo<{ attendance: Attendance }>(({ attendance }) => {
  // Tính tổng giờ từ checkInTime và checkOutTime nếu có
  const calculatedHours = useMemo(() => {
    if (!attendance.checkInTime || !attendance.checkOutTime) {
      return attendance.totalHours ?? null
    }
    const start = new Date(attendance.checkInTime).getTime()
    const end = new Date(attendance.checkOutTime).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return attendance.totalHours ?? null
    }
    const diffMs = end - start
    // Tính chính xác bằng giây, không làm tròn quá sớm
    const hours = diffMs / (1000 * 60 * 60)
    // Giữ nhiều chữ số thập phân để không mất thông tin với thời gian ngắn
    return hours
  }, [attendance.checkInTime, attendance.checkOutTime, attendance.totalHours])

  return (
    <tr className="history-row">
      <td suppressHydrationWarning>{formatDate(new Date(attendance.workDate))}</td>
      <td suppressHydrationWarning>{attendance.checkInTime ? formatTimeOnly(attendance.checkInTime) : '--'}</td>
      <td suppressHydrationWarning>{attendance.checkOutTime ? formatTimeOnly(attendance.checkOutTime) : '--'}</td>
      <td>{formatTotalHoursAsDateTime(calculatedHours)}</td>
      <td>
        <span className={`status-pill ${attendance.status}`}>{attendance.status}</span>
      </td>
    </tr>
  )
})
HistoryRow.displayName = 'HistoryRow'

const ClockHands = memo<{ status: 'IN' | 'OUT'; elapsedSeconds: number }>(({ status, elapsedSeconds }) => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!currentTime) {
    return (
      <>
        <div className="clock-hand clock-hand-hour" style={{ transform: 'rotate(0deg)' }} suppressHydrationWarning />
        <div className="clock-hand clock-hand-minute" style={{ transform: 'rotate(0deg)' }} suppressHydrationWarning />
        <div className="clock-hand clock-hand-second" style={{ transform: 'rotate(0deg)' }} suppressHydrationWarning />
        <div className="clock-center" />
      </>
    )
  }

  const hours = currentTime.getHours() % 12
  const minutes = currentTime.getMinutes()
  const seconds = currentTime.getSeconds()

  const hourAngle = (hours * 30) + (minutes * 0.5)
  const minuteAngle = minutes * 6
  const secondAngle = seconds * 6

  return (
    <>
      <div className="clock-hand clock-hand-hour" style={{ transform: `rotate(${hourAngle}deg)` }} suppressHydrationWarning />
      <div className="clock-hand clock-hand-minute" style={{ transform: `rotate(${minuteAngle}deg)` }} suppressHydrationWarning />
      <div className="clock-hand clock-hand-second" style={{ transform: `rotate(${secondAngle}deg)` }} suppressHydrationWarning />
      <div className="clock-center" />
    </>
  )
})
ClockHands.displayName = 'ClockHands'

type SlimeOverlayProps = {
  clockRef: React.RefObject<HTMLDivElement | null>
  checkButtonRef: React.RefObject<HTMLButtonElement | null>
}

const CatOverlay = memo<SlimeOverlayProps>(({ clockRef }) => {
  const catRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const velRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const tiltRef = useRef<number>(0)
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ active: boolean; id: number | null }>({ active: false, id: null })
  const rafRef = useRef<number | null>(null)
  const returnRef = useRef<{ active: boolean; start: number; from: { x: number; y: number } }>({ active: false, start: 0, from: { x: 0, y: 0 } })

  useEffect(() => {
    const clockEl = clockRef.current
    const catEl = catRef.current
    if (!clockEl || !catEl) return

    let width = clockEl.clientWidth
    let height = clockEl.clientHeight
    const catSize = 60
    let last = performance.now()
    let home = { x: width / 2, y: height / 2 + Math.min(width, height) / 2 - catSize / 2 - 4 }

    const resize = () => {
      width = clockEl.clientWidth
      height = clockEl.clientHeight
      home = { x: width / 2, y: height / 2 + Math.min(width, height) / 2 - catSize / 2 - 4 }
      posRef.current = home
    }

    const clampTilt = (t: number) => Math.max(-0.17, Math.min(0.17, t)) // ~±10°

    const onPointerMove = (e: PointerEvent) => {
      const rect = clockEl.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      hoverRef.current = { x, y }
      if (dragRef.current.active && dragRef.current.id === e.pointerId) {
        posRef.current = { x, y }
        returnRef.current = { active: false, start: 0, from: posRef.current }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const rect = clockEl.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const dist = Math.hypot(x - posRef.current.x, y - posRef.current.y)
      if (dist <= catSize) {
        dragRef.current = { active: true, id: e.pointerId }
        posRef.current = { x, y }
        returnRef.current = { active: false, start: 0, from: posRef.current }
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (dragRef.current.id === e.pointerId) {
        dragRef.current = { active: false, id: null }
        returnRef.current = { active: true, start: performance.now(), from: posRef.current }
      }
    }

    const onLeave = () => {
      hoverRef.current = null
      if (dragRef.current.active) {
        dragRef.current = { active: false, id: null }
        returnRef.current = { active: true, start: performance.now(), from: posRef.current }
      }
    }

    clockEl.addEventListener('pointermove', onPointerMove)
    clockEl.addEventListener('pointerleave', onLeave)
    clockEl.addEventListener('pointerdown', onPointerDown)
    clockEl.addEventListener('pointerup', onPointerUp)

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const clockDegToRad = (deg: number) => ((deg - 90) * Math.PI) / 180

    const tick = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now

      // Home follow along bottom arc 5h-8h (slow drift)
      const arcStart = clockDegToRad(150) // 5h
      const arcEnd = clockDegToRad(240) // 8h
      const arcMid = (arcStart + arcEnd) / 2
      const arcSpan = (arcEnd - arcStart) / 2
      const angle = arcMid + Math.sin(now * 0.001) * arcSpan * 0.35
      const radius = Math.min(width, height) / 2 - catSize / 2 - 4
      home = { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius }

      let target = home

      // Hover tilt only
      let tiltTarget = 0
      if (hoverRef.current) {
        const dx = hoverRef.current.x - home.x
        const dy = hoverRef.current.y - home.y
        const ang = Math.atan2(dy, dx)
        const diff = Math.atan2(Math.sin(ang - Math.PI / 2), Math.cos(ang - Math.PI / 2))
        tiltTarget = clampTilt(diff * 0.5)
      }

      // Drag positioning (clamp to small radius from home)
      if (dragRef.current.active && hoverRef.current) {
        const dx = hoverRef.current.x - home.x
        const dy = hoverRef.current.y - home.y
        const dist = Math.min(60, Math.hypot(dx, dy))
        const dir = Math.atan2(dy, dx)
        target = { x: home.x + Math.cos(dir) * dist, y: home.y + Math.sin(dir) * dist }
      }

      // Return animation after drag
      if (returnRef.current.active) {
        const t = Math.min(1, (now - returnRef.current.start) / 500)
        const p = easeOutCubic(t)
        target = {
          x: returnRef.current.from.x + (home.x - returnRef.current.from.x) * p,
          y: returnRef.current.from.y + (home.y - returnRef.current.from.y) * p
        }
        if (t >= 1) {
          returnRef.current.active = false
        }
      }

      // Overdamped spring to target on position
      const k = 0.12
      const c = 0.9
      const pos = posRef.current
      velRef.current.x += (target.x - pos.x) * k
      velRef.current.y += (target.y - pos.y) * k
      velRef.current.x *= c
      velRef.current.y *= c
      posRef.current = { x: pos.x + velRef.current.x * (dt / 16.6), y: pos.y + velRef.current.y * (dt / 16.6) }

      // Clamp to rim (6h line)
      const dxHome = posRef.current.x - width / 2
      const dyHome = posRef.current.y - height / 2
      const distHome = Math.hypot(dxHome, dyHome) || 1
      const clampedX = width / 2 + (dxHome / distHome) * radius
      const clampedY = height / 2 + (dyHome / distHome) * radius
      posRef.current = { x: clampedX, y: clampedY }

      // Tilt ease
      tiltRef.current += (tiltTarget - tiltRef.current) * 0.15

      const baseAngle = clockDegToRad(180) // 6h
      const drawAngle = baseAngle + tiltRef.current
      catEl.style.transform = `translate(${posRef.current.x - catSize / 2}px, ${posRef.current.y - catSize / 2}px) rotate(${drawAngle}rad)`

      rafRef.current = requestAnimationFrame(tick)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(clockEl)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      clockEl.removeEventListener('pointermove', onPointerMove)
      clockEl.removeEventListener('pointerleave', onLeave)
      clockEl.removeEventListener('pointerdown', onPointerDown)
      clockEl.removeEventListener('pointerup', onPointerUp)
    }
  }, [clockRef])

  return (
    <div className="cat-overlay" aria-hidden>
      <div ref={catRef} className="cat-simple">
        <div className="cat-ears">
          <div className="cat-ear left" />
          <div className="cat-ear right" />
        </div>
        <div className="cat-head">
          <div className="cat-eye left" />
          <div className="cat-eye right" />
          <div className="cat-nose" />
        </div>
        <div className="cat-body">
          <div className="cat-tail" />
          <div className="cat-paws">
            <div className="cat-paw left" />
            <div className="cat-paw right" />
          </div>
        </div>
      </div>
    </div>
  )
})
CatOverlay.displayName = 'CatOverlay'

const BadgePill = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <span className={`history-badge ${className}`.trim()}>{children}</span>
)

const BadgeStreak = ({ streakDays }: { streakDays: number }) => {
  if (streakDays < 3) return null
  return (
    <BadgePill className="history-badge-streak">
      <span aria-hidden>🔥</span>
      <span>Streak 3+ days</span>
    </BadgePill>
  )
}

const BadgeLevel = ({ level }: { level: number }) => (
  <BadgePill className="history-badge-level">
    <span>{`Lv.${level}`}</span>
  </BadgePill>
)

const UserDashboardPage = (): ReactElement => {
  const router = useRouter()
  const currentUser = useRequireAuth()

  const [records, setRecords] = useState<Attendance[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [activeRecord, setActiveRecord] = useState<Attendance | null>(null)
  const [peers, setPeers] = useState<PeerUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<'me' | number>('me')
  const [filters, setFilters] = useState<{ startDate: string; endDate: string }>(() => {
    const todayStr = getTodayString()
    return { startDate: todayStr, endDate: todayStr }
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isLoadingPeers, setIsLoadingPeers] = useState(false)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [isDatePickerQuickOpen, setIsDatePickerQuickOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [showFilterNudge, setShowFilterNudge] = useState(false)
  const [nudgeTop, setNudgeTop] = useState(0)
  const [clockAnimation, setClockAnimation] = useState<'checkin' | 'checkout' | null>(null)
  const sidebarCloseTimeoutRef = useRef<number | null>(null)
  const clockFaceRef = useRef<HTMLDivElement | null>(null)
  const checkButtonRef = useRef<HTMLButtonElement | null>(null)
  const [dateInfo, setDateInfo] = useState<{ weekday: string; day: string; month: string; year: string }>({
    weekday: '',
    day: '',
    month: '',
    year: ''
  })
  const today = useMemo(() => getTodayString(), [])
  const filterRangeValue = useMemo<DateRangeValue>(
    () => ({
      start: safeDateFromString(filters.startDate),
      end: safeDateFromString(filters.endDate)
    }),
    [filters.endDate, filters.startDate]
  )
  const formatFilterDate = useCallback((value: string): string => {
    if (!value) return '---'
    const [year, month, day] = value.split('-')
    if (!year || !month || !day) return value
    return `${day}-${month}-${year}`
  }, [])
  const isViewingSelf = useMemo(() => {
    if (!currentUser) return selectedUserId === 'me'
    return selectedUserId === 'me' || selectedUserId === currentUser.id
  }, [currentUser, selectedUserId])
  const peerOptions = useMemo(() => {
    const list = [...peers]
    if (currentUser && !list.some((p) => p.id === currentUser.id)) {
      list.unshift({
        id: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        role: currentUser.role,
        isSelf: true
      })
    }

    const dedup = new Map<number, PeerUser>()
    list.forEach((u) => {
      dedup.set(u.id, u)
    })

    return Array.from(dedup.values())
  }, [currentUser, peers])
  const userChoices = useMemo(() => {
    const options: Array<{ id: 'me' | number; label: string }> = [
      {
        id: 'me',
        label: formatUserOptionLabel(
          {
            fullName: currentUser?.fullName,
            username: currentUser?.username,
            id: currentUser?.id,
            isSelf: true
          },
          'Bạn'
        )
      }
    ]

    peerOptions
      .filter((p) => (currentUser ? p.id !== currentUser.id : true))
      .forEach((p) => {
        options.push({
          id: p.id,
          label: formatUserOptionLabel(
            { fullName: p.fullName, username: p.username, id: p.id, isSelf: Boolean(p.isSelf) },
            `User #${p.id}`
          )
        })
      })

    return options
  }, [currentUser, peerOptions])
  const selectedUserDisplay = useMemo(() => {
    if (isViewingSelf) {
      return currentUser?.fullName ?? currentUser?.username ?? 'bạn'
    }
    const peer = typeof selectedUserId === 'number'
      ? peerOptions.find((p) => p.id === selectedUserId)
      : undefined
    if (peer) return peer.fullName || peer.username || `User #${peer.id}`
    if (typeof selectedUserId === 'number') return `User #${selectedUserId}`
    return 'người dùng'
  }, [currentUser, isViewingSelf, peerOptions, selectedUserId])
  const historyTitle = useMemo(() => {
    const start = filters.startDate || today
    const end = filters.endDate || today
    const isDefaultToday = start === today && end === today

    if (isDefaultToday) {
      return `Nhật ký của ${isViewingSelf ? 'bạn' : selectedUserDisplay} (ngày ${formatFilterDate(today)})`
    }

    if (filters.startDate || filters.endDate) {
      const resolvedEndDate = filters.endDate || today
      return `Nhật ký của ${isViewingSelf ? 'bạn' : selectedUserDisplay} từ ${formatFilterDate(filters.startDate)} đến ${formatFilterDate(resolvedEndDate)}`
    }

    return `Nhật ký của ${isViewingSelf ? 'bạn' : selectedUserDisplay} (đến ${formatFilterDate(today)})`
  }, [filters.endDate, filters.startDate, formatFilterDate, isViewingSelf, selectedUserDisplay, today])
  const canCheckInOut = useMemo(() => Boolean(currentUser && isViewingSelf), [currentUser, isViewingSelf])
  const [message, setMessage] = useState<MessageState>(null)
  const messageTimeoutRef = useRef<number | null>(null)
  const userPickerRef = useRef<HTMLDivElement | null>(null)
  const topbarMenuRef = useRef<HTMLDivElement | null>(null)
  const topbarMenuTimeoutRef = useRef<number | null>(null)
  const [isTopbarMenuOpen, setIsTopbarMenuOpen] = useState(false)

  const { totalHours, streakDays, level } = useMemo(() => calculateAttendanceStats(records), [records])

  const averageHours = useMemo(() => {
    if (!records.length) return 0
    return Math.round((totalHours / records.length) * 100) / 100
  }, [records.length, totalHours])

  const lastRecord = useMemo(() => {
    if (!records.length) return null
    if (activeRecord) {
      const other = records.find((rec) => rec.id !== activeRecord.id)
      return other ?? activeRecord
    }
    return records[0]
  }, [activeRecord, records])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE)), [records.length])

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE
    return records.slice(start, start + HISTORY_PAGE_SIZE)
  }, [currentPage, records])

  const sessionTimerText = useMemo(() => {
    if (status !== 'IN' || !activeRecord?.checkInTime) return 'Chưa bắt đầu'
    return formatElapsedDuration(elapsedSeconds)
  }, [activeRecord?.checkInTime, elapsedSeconds, status])

  const pushMessage = useCallback((payload: MessageState) => {
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current)
      messageTimeoutRef.current = null
    }

    setMessage(payload)

    if (payload) {
      messageTimeoutRef.current = window.setTimeout(() => {
        setMessage(null)
        messageTimeoutRef.current = null
      }, MESSAGE_TIMEOUT)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [records])

  useEffect(() => {
    setDateInfo(formatDateDetailed(new Date()))
  }, [])

  useEffect(() => {
    if (!showUserPicker) return

    // Đóng DatePicker dropdown khi mở user picker
    setIsDatePickerQuickOpen(false)

    const handleClickOutside = (event: MouseEvent) => {
      if (!userPickerRef.current) return
      if (event.target instanceof Node && !userPickerRef.current.contains(event.target)) {
        setShowUserPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserPicker])

  useEffect(() => {
    if (!isDatePickerQuickOpen) return

    // Đóng user picker khi mở DatePicker dropdown
    setShowUserPicker(false)
  }, [isDatePickerQuickOpen])

  useEffect(() => {
    if (status !== 'IN' || !activeRecord?.checkInTime) {
      setElapsedSeconds(0)
      return
    }

    const startMs = new Date(activeRecord.checkInTime).getTime()
    if (Number.isNaN(startMs)) {
      setElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      const diff = Date.now() - startMs
      const seconds = Math.max(0, Math.floor(diff / 1000))
      setElapsedSeconds(seconds)
    }

    updateElapsed()
    const intervalId = window.setInterval(updateElapsed, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeRecord?.checkInTime, status])

  const buildQueryString = useCallback(
    (user: 'me' | number, start?: string, end?: string) => {
      const params = new URLSearchParams({ userId: user === 'me' ? 'me' : String(user) })
      const startDate = start?.trim()
      const endDate = (end ?? '').trim() || today
      if (startDate) params.append('from', startDate)
      if (endDate) params.append('to', endDate)
      return params.toString()
    },
    [today]
  )

  const fetchAttendance = useCallback(
    async (payload?: { startDate?: string; endDate?: string; userId?: 'me' | number }) => {
      if (!currentUser) return
      const targetUserId = payload?.userId ?? selectedUserId
      setIsLoading(true)
      try {
        const qs = buildQueryString(targetUserId, payload?.startDate ?? filters.startDate, payload?.endDate ?? filters.endDate)
        const res = await apiClient.get<{
          data?: Attendance[]
          status?: 'IN' | 'OUT'
          activeRecord?: Attendance | null
        }>(`/api/attendance?${qs}`)

        const data = res?.data ?? []
        const sortedData = [...data].sort(
          (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
        )

        setRecords(sortedData)
        setStatus(res?.status === 'IN' ? 'IN' : 'OUT')
        setActiveRecord(res?.activeRecord ?? null)
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không thể tải dữ liệu chấm công'
        console.warn('Error fetching attendance:', message)
        pushMessage({ type: 'error', text: message })
      } finally {
        setIsLoading(false)
      }
    },
    [buildQueryString, currentUser, filters.endDate, filters.startDate, pushMessage, selectedUserId]
  )

  const loadPeers = useCallback(async () => {
    if (!currentUser) return
    setIsLoadingPeers(true)
    try {
      const res = await apiClient.get<{ data?: PeerUser[] }>('/api/users/peers')
      setPeers(res?.data ?? [])
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không thể tải danh sách đồng nghiệp'
      console.warn('Error loading peers:', message)
      pushMessage({ type: 'error', text: message })
    } finally {
      setIsLoadingPeers(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    loadPeers()
  }, [currentUser, loadPeers])

  useEffect(() => {
    if (!currentUser) return
    fetchAttendance()
  }, [currentUser, fetchAttendance, selectedUserId])

  const handleUserSelect = useCallback((userId: 'me' | number) => {
    setSelectedUserId(userId)
    setShowUserPicker(false)
    setIsTopbarMenuOpen(false)
  }, [])

  const handleLogout = useCallback(() => {
    authUtils.clearAuth()
    router.replace('/login')
  }, [router])

  const handleCheckIn = useCallback(async () => {
    if (!currentUser) return
    if (!canCheckInOut) {
      pushMessage({ type: 'error', text: 'Bạn đang xem đồng nghiệp, không thể check-in thay họ.' })
      return
    }
    if (status === 'IN') {
      pushMessage({ type: 'error', text: 'Bạn đang trong phiên làm việc, hãy check-out trước.' })
      return
    }

    setIsChecking(true)
    setClockAnimation('checkin')
    try {
      await apiClient.post('/api/attendance/checkin', {})
      await fetchAttendance()
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Không thể check-in'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
      setTimeout(() => setClockAnimation(null), 1000)
    }
  }, [canCheckInOut, currentUser, status, fetchAttendance, pushMessage])

  const handleCheckOut = useCallback(async () => {
    if (!currentUser) return
    if (!canCheckInOut) {
      pushMessage({ type: 'error', text: 'Bạn đang xem đồng nghiệp, không thể check-out thay họ.' })
      return
    }
    if (status === 'OUT') {
      pushMessage({ type: 'error', text: 'Bạn chưa check-in' })
      return
    }

    setIsChecking(true)
    setClockAnimation('checkout')
    try {
      await apiClient.post('/api/attendance/checkout', {})
      await fetchAttendance()
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Không thể check-out'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
      setTimeout(() => setClockAnimation(null), 1000)
    }
  }, [canCheckInOut, currentUser, status, fetchAttendance, pushMessage])

  const historyRef = useRef<HTMLElement | null>(null)
  const canViewUsers = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.MANAGER

  const scrollToHistory = useCallback(() => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
  }, [])

  const handleFilterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await fetchAttendance({ ...filters, userId: selectedUserId })
      scrollToHistory()
      setIsSidebarOpen(false)
    },
    [fetchAttendance, filters, scrollToHistory, selectedUserId]
  )

  const handleResetFilters = useCallback(async () => {
    setFilters({ startDate: today, endDate: today })
    await fetchAttendance({ startDate: today, endDate: today, userId: selectedUserId })
    scrollToHistory()
  }, [fetchAttendance, scrollToHistory, selectedUserId, today])

  const handleDatePickerChange = useCallback(
    (nextValue: Date | DateRangeValue | null) => {
      if (!nextValue) {
        setFilters({ startDate: '', endDate: '' })
        return
      }

      if (nextValue instanceof Date) {
        const nextString = toDateInputString(nextValue)
        setFilters({ startDate: nextString, endDate: nextString })
        void fetchAttendance({ startDate: nextString, endDate: nextString, userId: selectedUserId })
        return
      }

      const startStr = toDateInputString(nextValue.start)
      const endStr = toDateInputString(nextValue.end ?? nextValue.start ?? null) || startStr
      setFilters({ startDate: startStr, endDate: endStr })

      if (startStr && endStr) {
        void fetchAttendance({ startDate: startStr, endDate: endStr, userId: selectedUserId })
      }
    },
    [fetchAttendance, selectedUserId]
  )

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(nextPage, 1), totalPages)
      setCurrentPage(clamped)
    },
    [totalPages]
  )

  const handleHistoryMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setShowFilterNudge(true)
    setNudgeTop(event.clientY)
  }, [])

  const handleHistoryMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (showFilterNudge) {
      setNudgeTop(event.clientY)
    }
  }, [showFilterNudge])

  const handleHistoryMouseLeave = useCallback(() => {
    setShowFilterNudge(false)
  }, [])

  const handleTopbarMouseEnter = useCallback(() => {
    if (topbarMenuTimeoutRef.current) {
      window.clearTimeout(topbarMenuTimeoutRef.current)
      topbarMenuTimeoutRef.current = null
    }
    setIsTopbarMenuOpen(true)
  }, [])

  const handleTopbarMouseLeave = useCallback(() => {
    topbarMenuTimeoutRef.current = window.setTimeout(() => {
      setIsTopbarMenuOpen(false)
      topbarMenuTimeoutRef.current = null
    }, 160)
  }, [])

  const handleSidebarMouseEnter = useCallback(() => {
    if (sidebarCloseTimeoutRef.current) {
      window.clearTimeout(sidebarCloseTimeoutRef.current)
      sidebarCloseTimeoutRef.current = null
    }
    setIsSidebarHovered(true)
  }, [])

  const handleSidebarMouseLeave = useCallback(() => {
    setIsSidebarHovered(false)
    // Delay đóng sidebar 0.5s để tránh đóng nhầm
    sidebarCloseTimeoutRef.current = window.setTimeout(() => {
      if (!isSidebarOpen) {
        setIsSidebarHovered(false)
      }
      sidebarCloseTimeoutRef.current = null
    }, 500)
  }, [isSidebarOpen])

  const handleTriggerMouseEnter = useCallback(() => {
    if (sidebarCloseTimeoutRef.current) {
      window.clearTimeout(sidebarCloseTimeoutRef.current)
      sidebarCloseTimeoutRef.current = null
    }
    setIsSidebarHovered(true)
  }, [])

  const handleTriggerMouseLeave = useCallback(() => {
    // Delay đóng sidebar 1s
    sidebarCloseTimeoutRef.current = window.setTimeout(() => {
      setIsSidebarHovered(false)
      sidebarCloseTimeoutRef.current = null
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (sidebarCloseTimeoutRef.current) {
        window.clearTimeout(sidebarCloseTimeoutRef.current)
      }
      if (topbarMenuTimeoutRef.current) {
        window.clearTimeout(topbarMenuTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="apple-attendance">
      <header className="apple-topbar">
        <div className="topbar-blur" />
        <div className="topbar-content">
          <div className="topbar-left">
            <ThemeToggle />
          </div>
          <div
            className={`topbar-center ${isTopbarMenuOpen ? 'menu-open' : ''}`}
            onMouseEnter={handleTopbarMouseEnter}
            onMouseLeave={handleTopbarMouseLeave}
            ref={topbarMenuRef}
          >
            <div className="topbar-title-trigger" aria-haspopup="menu" aria-expanded={isTopbarMenuOpen}>
              <span className="topbar-title">Chấm công · {isViewingSelf ? 'Bạn' : selectedUserDisplay}</span>
              <span className="chevron">▾</span>
            </div>
            {isViewingSelf ? <span className="topbar-underline" /> : null}
            {isTopbarMenuOpen ? (
              <div className="user-menu topbar-user-menu" role="menu">
                {userChoices.map((choice) => (
                  <button
                    key={choice.id === 'me' ? 'me' : String(choice.id)}
                    type="button"
                    className={`user-menu-item${selectedUserId === choice.id ? ' active' : ''}`}
                    onClick={() => handleUserSelect(choice.id)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-button danger" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {message ? (
        <div className={`inline-message ${message.type}`} role="status" aria-live="polite">
          <span>{message.text}</span>
        </div>
      ) : null}

      {/* Sidebar trigger */}
      <div
        className="sidebar-trigger"
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
      />

      {/* Sidebar */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside
        className={`sidebar ${isSidebarOpen || isSidebarHovered ? 'open' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="sidebar-content">
          <div className="user-card" ref={userPickerRef}>
            <div className="user-card-head">
              <div>
                <p className="eyebrow">Bộ lọc</p>
                <p className="subtle-text">{isViewingSelf ? 'Bạn' : selectedUserDisplay}</p>
              </div>
            </div>
            <div className="user-selector-block">
              <button
                type="button"
                className="user-selector"
                onClick={() => setShowUserPicker((prev) => !prev)}
                disabled={isLoadingPeers}
                aria-expanded={showUserPicker}
              >
                <div className="user-selector-main">
                  <span className="user-avatar">{(selectedUserDisplay || 'B').slice(0, 1).toUpperCase()}</span>
                  <div className="user-selector-text">
                    <p className="label">Người dùng</p>
                    <strong>{isViewingSelf ? 'Bạn' : selectedUserDisplay}</strong>
                  </div>
                </div>
                <span className="chevron">▾</span>
              </button>
              {showUserPicker ? (
                <div className="user-menu">
                  {userChoices.map((choice) => (
                    <button
                      key={choice.id === 'me' ? 'me' : String(choice.id)}
                      type="button"
                      className={`user-menu-item${selectedUserId === choice.id ? ' active' : ''}`}
                      onClick={() => handleUserSelect(choice.id)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="calendar-tile">
              <form className="filter-compact" onSubmit={handleFilterSubmit}>
                <div className="calendar-header">
                  <span className="calendar-title">Chọn khoảng ngày</span>
                  <span className="chevron">▾</span>
                </div>
                <DatePicker
                  mode="range"
                  value={filterRangeValue}
                  onChange={handleDatePickerChange}
                  showQuickFilters
                  quickOpen={isDatePickerQuickOpen}
                  onQuickOpenChange={setIsDatePickerQuickOpen}
                  ariaLabel="Chọn khoảng ngày"
                />
                <div className="filter-compact-buttons">
                  <button type="submit" className="btn primary" disabled={isLoading}>
                    {isLoading ? 'Đang lọc...' : 'Áp dụng'}
                  </button>
                  <button type="button" className="btn ghost" onClick={handleResetFilters} disabled={isLoading}>
                    Xóa
                  </button>
                  {canViewUsers ? (
                    <button type="button" className="btn ghost" onClick={() => router.push('/users')}>
                      Người dùng
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="apple-shell">
        <main className="apple-main">
          <section className="hero-section">
            <div className="clock-container">
              <div className={`clock-face ${clockAnimation ? `clock-animate-${clockAnimation}` : ''}`} ref={clockFaceRef}>
                <CatOverlay clockRef={clockFaceRef} checkButtonRef={checkButtonRef} />
                {/* Clock numbers */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                  <div key={num} className={`clock-number clock-number-${num}`}>
                    {num}
                  </div>
                ))}

                {/* Clock hands */}
                <ClockHands status={status} elapsedSeconds={elapsedSeconds} />

                {/* Check-in/Checkout button positioned like stopwatch button */}
                <button
                  className={`clock-check-button ${status === 'IN' ? 'checkout' : 'checkin'}`}
                  ref={checkButtonRef}
                  onClick={status === 'IN' ? (canCheckInOut ? handleCheckOut : undefined) : (canCheckInOut ? handleCheckIn : undefined)}
                  disabled={isChecking || !canCheckInOut}
                  aria-label={status === 'IN' ? 'Check-out' : 'Check-in'}
                >
                  {!canCheckInOut ? 'Chỉ xem' : isChecking ? 'Đang xử lý...' : status === 'IN' ? 'Check-out' : 'Check-in'}
                </button>
              </div>

              {/* Date display below clock */}
              <div className="clock-date-box" suppressHydrationWarning>
                <div className="date-weekday">{dateInfo.weekday}</div>
                <div className="date-details">
                  <span className="date-day">{dateInfo.day}</span>
                  <span className="date-separator">/</span>
                  <span className="date-month">{dateInfo.month}</span>
                  <span className="date-separator">/</span>
                  <span className="date-year">{dateInfo.year}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="history-block" ref={historyRef} onMouseEnter={handleHistoryMouseEnter} onMouseMove={handleHistoryMouseMove} onMouseLeave={handleHistoryMouseLeave}>
            <div className="history-head">
              <div>
                <p className="eyebrow">Lịch sử chấm công</p>
                <h2>{historyTitle}</h2>
                <p className="subhead">Xem lại chấm công theo ngày và người dùng.</p>
              </div>
              <div className="history-badge-group">
                <BadgeLevel level={level} />
                <BadgeStreak streakDays={streakDays} />
              </div>
            </div>

            {isLoading ? (
              <div className="history-skeleton">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="skeleton-row" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="history-empty">
                <div className="empty-icon">⌛</div>
                <p>Không có dữ liệu chấm công.</p>
              </div>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Tổng giờ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>{paginatedRecords.map((att) => <HistoryRow key={att.id} attendance={att} />)}</tbody>
                </table>
              </div>
            )}

            {records.length > HISTORY_PAGE_SIZE ? (
              <div className="pagination">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trang trước
                </button>
                <span className="pagination-info">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Trang sau
                </button>
              </div>
            ) : null}

            <div className="summary-grid">
              <div className="summary-card">
                <p className="eyebrow">Tổng thời gian làm việc</p>
                <strong className="summary-value">{formatTotalHoursAsDateTime(totalHours)}</strong>
                <p className="note">Tính theo khoảng thời gian bạn đang lọc.</p>
              </div>
              <div className="summary-card">
                <p className="eyebrow">Số phiên</p>
                <strong className="summary-value">{records.length}</strong>
                <p className="note">Tổng số phiên trong bộ lọc.</p>
              </div>
              <div className="summary-card">
                <p className="eyebrow">Thời lượng trung bình</p>
                <strong className="summary-value">{formatTotalHoursAsDateTime(averageHours)}</strong>
                <p className="note">Thời lượng trung bình mỗi phiên.</p>
              </div>
            </div>
          </section>

          {showFilterNudge ? (
            <div className="filter-nudge" style={{ top: `${nudgeTop}px` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="6" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="6" cy="18" r="2" fill="currentColor" />
              </svg>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default UserDashboardPage
