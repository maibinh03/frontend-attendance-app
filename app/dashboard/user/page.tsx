'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement
} from 'react'
import { useRouter } from 'next/navigation'
import DatePicker, { type DateRangeValue } from '@/components/date-picker'
import { USER_ROLES, authUtils } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { formatDate, formatDateTime, formatTotalHours } from '@/lib/utils/format'
import { MESSAGE_TIMEOUT } from '@/lib/constants'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import '@/app/styles/user-dashboard.css'

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

const HistoryRow = memo<{ attendance: Attendance }>(({ attendance }) => (
  <tr className="history-row">
    <td suppressHydrationWarning>{formatDate(new Date(attendance.workDate))}</td>
    <td suppressHydrationWarning>{attendance.checkInTime ? formatDateTime(attendance.checkInTime) : '--'}</td>
    <td suppressHydrationWarning>{attendance.checkOutTime ? formatDateTime(attendance.checkOutTime) : '--'}</td>
    <td>{formatTotalHours(attendance.totalHours ?? null)}</td>
    <td>
      <span className={`status-pill ${attendance.status}`}>{attendance.status}</span>
    </td>
  </tr>
))
HistoryRow.displayName = 'HistoryRow'

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

  const totalHours = useMemo(() => {
    const hours = records.reduce((sum, record) => {
      if (!record.checkInTime || !record.checkOutTime) return sum
      const start = new Date(record.checkInTime).getTime()
      const end = new Date(record.checkOutTime).getTime()
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum
      return sum + (end - start) / (1000 * 60 * 60)
    }, 0)
    return Math.round(hours * 100) / 100
  }, [records])

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
    if (!showUserPicker) return

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
        console.error('Error fetching attendance:', err)
        pushMessage({ type: 'error', text: 'Không thể tải dữ liệu chấm công' })
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
      console.error('Error loading peers:', err)
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
    try {
      await apiClient.post('/api/attendance/checkin', {})
      pushMessage({ type: 'success', text: 'Check-in thành công!' })
      await fetchAttendance()
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Không thể check-in'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
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
    try {
      await apiClient.post('/api/attendance/checkout', {})
      pushMessage({ type: 'success', text: 'Check-out thành công!' })
      await fetchAttendance()
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Không thể check-out'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
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

  return (
    <div className="apple-attendance">
      <header className="apple-topbar">
        <div className="topbar-blur" />
        <div className="topbar-content">
          <div className="topbar-center">
            <span className="topbar-title">Chấm công · {isViewingSelf ? 'Bạn' : selectedUserDisplay}</span>
            {isViewingSelf ? <span className="topbar-underline" /> : null}
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

      <div className="apple-shell">
        <main className="apple-main">
          <section className="hero-grid">
            <div className="hero-card">
              <div className="hero-top">
                <div className="status-row">
                  <span className={`status-badge ${status === 'IN' ? 'active' : 'idle'}`}>
                    {status === 'IN' ? 'Đang làm việc' : 'Đang rảnh'}
                  </span>
                  {!canCheckInOut ? <span className="pill subtle">Đang xem đồng nghiệp</span> : null}
                </div>
                <div className="hero-heading">
                  <p className="eyebrow">Chấm công</p>
                  <h1>{status === 'IN' ? 'Phiên đang chạy' : 'Sẵn sàng bắt đầu'}</h1>
                  <p className="subhead">Theo dõi và chốt giờ làm tức thì.</p>
                </div>
                <div className="timer-block">
                  <div className="timer-meta">
                    <p className="eyebrow">Thời gian phiên</p>
                    <div className="live-row">
                      <span className={`live-dot ${status === 'IN' ? 'active' : 'idle'}`} />
                      <span className="timer-value" suppressHydrationWarning>
                        {sessionTimerText}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="session-meta">
                  <div className="meta-col">
                    <p className="label">Phiên hiện tại</p>
                    <strong suppressHydrationWarning>
                      {activeRecord ? formatDateTime(activeRecord.checkInTime) : 'Chưa bắt đầu'}
                    </strong>
                    <p className="note">{status === 'IN' ? 'Đang hoạt động' : 'Chưa check-in'}</p>
                  </div>
                  <div className="meta-col">
                    <p className="label">Phiên gần nhất</p>
                    <strong suppressHydrationWarning>
                      {lastRecord ? formatDate(new Date(lastRecord.workDate)) : 'Chưa có dữ liệu'}
                    </strong>
                    <p className="note" suppressHydrationWarning>
                      {lastRecord?.checkOutTime
                        ? `Check-out: ${formatDateTime(lastRecord.checkOutTime)}`
                        : lastRecord
                          ? 'Chưa check-out'
                          : 'Chưa ghi nhận ca làm việc'}
                    </p>
                  </div>
                  <div className="meta-col">
                    <p className="label">Trạng thái</p>
                    <strong>{status === 'IN' ? 'Đang làm việc' : 'Ngoài ca'}</strong>
                    <p className="note">{isViewingSelf ? 'Phiên của bạn' : 'Phiên của người đang xem'}</p>
                  </div>
                </div>
              </div>
              <div className="hero-actions">
                {status === 'IN' ? (
                  <button
                    className="btn primary danger"
                    onClick={canCheckInOut ? handleCheckOut : undefined}
                    disabled={isChecking || !canCheckInOut}
                  >
                    {!canCheckInOut ? 'Chỉ xem' : isChecking ? 'Đang xử lý...' : 'Check-out'}
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    onClick={canCheckInOut ? handleCheckIn : undefined}
                    disabled={isChecking || !canCheckInOut}
                  >
                    {!canCheckInOut ? 'Chỉ xem' : isChecking ? 'Đang xử lý...' : 'Check-in'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => fetchAttendance()}
                  disabled={isLoading || isChecking}
                >
                  {isLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
            </div>

            <div className="user-card" ref={userPickerRef}>
              <div className="user-card-head">
                <div>
                  <p className="eyebrow">Người dùng & Bộ lọc</p>
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
          </section>

          <section className="history-block" ref={historyRef}>
            <div className="history-head">
              <div>
                <p className="eyebrow">Lịch sử chấm công</p>
                <h2>{historyTitle}</h2>
                <p className="subhead">Xem lại chấm công theo ngày và người dùng.</p>
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
          </section>

          <section className="summary-grid">
            <div className="summary-card">
              <p className="eyebrow">Tổng giờ</p>
              <strong className="summary-value">{formatTotalHours(totalHours)}</strong>
              <p className="note">Tính theo khoảng thời gian bạn đang lọc.</p>
            </div>
            <div className="summary-card">
              <p className="eyebrow">Số phiên</p>
              <strong className="summary-value">{records.length}</strong>
              <p className="note">Tổng số phiên trong bộ lọc.</p>
            </div>
            <div className="summary-card">
              <p className="eyebrow">Thời lượng TB</p>
              <strong className="summary-value">{formatTotalHours(averageHours)}</strong>
              <p className="note">Thời lượng trung bình mỗi phiên.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default UserDashboardPage
