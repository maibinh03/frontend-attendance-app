'use client'

import {
  createElement,
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
import { USER_ROLES, authUtils } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { formatDate, formatDateTime, formatTotalHours } from '@/lib/utils/format'
import { MESSAGE_TIMEOUT } from '@/lib/constants'
import { useRequireAuth } from '@/hooks/useRequireAuth'

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

const formatUserOptionLabel = (
  user: { fullName?: string; username?: string; id?: number; isSelf?: boolean },
  fallback: string
): string => {
  const baseName = user.fullName && user.username
    ? `${user.fullName} (${user.username})`
    : user.fullName || user.username || fallback
  return user.isSelf ? `${baseName} - người dùng hiện tại` : baseName
}

const HistoryRow = memo<{ attendance: Attendance }>(({ attendance }) =>
  createElement(
    'tr',
    null,
    createElement('td', { suppressHydrationWarning: true }, formatDate(new Date(attendance.workDate))),
    createElement('td', { suppressHydrationWarning: true }, attendance.checkInTime ? formatDateTime(attendance.checkInTime) : '--'),
    createElement('td', { suppressHydrationWarning: true }, attendance.checkOutTime ? formatDateTime(attendance.checkOutTime) : '--'),
    createElement('td', null, formatTotalHours(attendance.totalHours ?? null)),
    createElement(
      'td',
      null,
      createElement('span', { className: `ritzy-badge ${attendance.status}` }, attendance.status)
    )
  )
)
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
  const [showFilters, setShowFilters] = useState(false)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const today = useMemo(() => getTodayString(), [])
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

  const handleFilterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await fetchAttendance({ ...filters, userId: selectedUserId })
      setShowFilters(false)
    },
    [fetchAttendance, filters, selectedUserId]
  )

  const handleResetFilters = useCallback(async () => {
    setFilters({ startDate: today, endDate: today })
    await fetchAttendance({ startDate: today, endDate: today, userId: selectedUserId })
    setShowFilters(false)
  }, [fetchAttendance, selectedUserId, today])

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(nextPage, 1), totalPages)
      setCurrentPage(clamped)
    },
    [totalPages]
  )

  const canViewUsers = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.MANAGER

  return createElement(
    'div',
    { className: 'ritzy-dashboard' },
    createElement(
      'div',
      { className: 'ritzy-shell' },
      createElement(
        'header',
        { className: 'ritzy-top-bar' },
        createElement(
          'div',
          null,
          createElement('p', { className: 'ritzy-brand' }, 'Chấm công Bình Boong'),
          currentUser
            ? createElement('p', { className: 'ritzy-greeting' }, 'Xin chào, ', currentUser.fullName ?? currentUser.username)
            : null
        ),
        createElement(
          'div',
          { className: 'ritzy-top-actions' },
          canViewUsers
            ? createElement(
              'button',
              { className: 'ritzy-btn ghost', onClick: () => router.push('/users') },
              'View All Users'
            )
            : null,
          createElement('button', { className: 'ritzy-btn', onClick: handleLogout }, 'Đăng xuất')
        )
      ),
      message ? createElement('div', { className: `ritzy-alert ${message.type}` }, message.text) : null,
      createElement(
        'section',
        { className: 'ritzy-history' },
        createElement(
          'header',
          null,
          createElement(
            'div',
            null,
            createElement('p', { className: 'ritzy-overline' }, 'Lịch sử chấm công'),
            createElement('h2', { className: 'ritzy-panel-title' }, historyTitle)
          ),
          createElement(
            'div',
            { className: 'ritzy-top-actions' },
            createElement(
              'div',
              {
                className: 'ritzy-user-switcher',
                ref: userPickerRef,
                style: { position: 'relative' }
              },
              createElement(
                'button',
                {
                  type: 'button',
                  className: 'ritzy-btn ghost',
                  onClick: () => setShowUserPicker((prev) => !prev),
                  disabled: isLoadingPeers
                },
                createElement('span', null, `Đang xem: ${isViewingSelf ? 'Bạn' : selectedUserDisplay}`),
                createElement('span', { className: 'ritzy-chip-action' }, isLoadingPeers ? 'Đang tải...' : showUserPicker ? ' Đóng' : ' Đổi')
              ),
              showUserPicker
                ? createElement(
                  'div',
                  {
                    className: 'ritzy-user-menu',
                    style: {
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--ritzy-surface, #fff)',
                      border: '1px solid var(--ritzy-border, #e5e7eb)',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '220px',
                      zIndex: 10
                    }
                  },
                  userChoices.map((choice) =>
                    createElement(
                      'button',
                      {
                        key: choice.id === 'me' ? 'me' : String(choice.id),
                        type: 'button',
                        className: `ritzy-user-menu-item${selectedUserId === choice.id ? ' active' : ''}`,
                        onClick: () => handleUserSelect(choice.id),
                        style: {
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: selectedUserId === choice.id ? 'var(--ritzy-muted, #f1f5f9)' : 'transparent',
                          cursor: 'pointer'
                        }
                      },
                      choice.label
                    )
                  )
                )
                : null
            ),
            createElement(
              'button',
              {
                className: 'ritzy-btn ghost',
                type: 'button',
                onClick: () => {
                  setShowFilters((prev) => !prev)
                  setShowUserPicker(false)
                }
              },
              'Bộ lọc'
            ),
            createElement('span', { className: 'ritzy-calendar-chip' }, `${records.length} phiên`)
          )
        ),
        showFilters
          ? createElement(
            'form',
            { className: 'ritzy-filter-form', onSubmit: handleFilterSubmit },
            createElement(
              'div',
              { className: 'ritzy-filter-grid' },
              createElement(
                'label',
                null,
                'Start date',
                createElement('input', {
                  type: 'date',
                  value: filters.startDate,
                  onChange: (e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                })
              ),
              createElement(
                'label',
                null,
                'End date',
                createElement('input', {
                  type: 'date',
                  value: filters.endDate,
                  onChange: (e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                })
              )
            ),
            createElement(
              'div',
              { className: 'ritzy-filter-actions' },
              createElement('button', { type: 'submit', className: 'ritzy-btn', disabled: isLoading }, isLoading ? 'Đang lọc...' : 'Áp dụng'),
              createElement(
                'button',
                {
                  type: 'button',
                  className: 'ritzy-btn ghost',
                  onClick: handleResetFilters,
                  disabled: isLoading
                },
                'Xóa lọc'
              )
            )
          )
          : null,
        isLoading
          ? createElement('p', { className: 'ritzy-placeholder' }, 'Đang tải dữ liệu...')
          : records.length === 0
            ? createElement('p', { className: 'ritzy-placeholder' }, 'Không có dữ liệu chấm công.')
            : createElement(
              'div',
              null,
              createElement(
                'div',
                { className: 'ritzy-table-wrapper' },
                createElement(
                  'table',
                  { className: 'ritzy-history-table' },
                  createElement(
                    'thead',
                    null,
                    createElement(
                      'tr',
                      null,
                      createElement('th', null, 'Ngày'),
                      createElement('th', null, 'Check-in'),
                      createElement('th', null, 'Check-out'),
                      createElement('th', null, 'Tổng giờ'),
                      createElement('th', null, 'Trạng thái')
                    )
                  ),
                  createElement(
                    'tbody',
                    null,
                    paginatedRecords.map((att) => createElement(HistoryRow, { key: att.id, attendance: att }))
                  )
                )
              ),
              records.length > HISTORY_PAGE_SIZE
                ? createElement(
                  'div',
                  { className: 'ritzy-pagination' },
                  createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'ritzy-btn ghost',
                      onClick: () => handlePageChange(currentPage - 1),
                      disabled: currentPage === 1
                    },
                    'Trang trước'
                  ),
                  createElement(
                    'span',
                    { className: 'ritzy-pagination-info' },
                    `Trang ${currentPage} / ${totalPages}`
                  ),
                  createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'ritzy-btn ghost',
                      onClick: () => handlePageChange(currentPage + 1),
                      disabled: currentPage === totalPages
                    },
                    'Trang sau'
                  )
                )
                : null
            ),
        createElement(
          'div',
          { className: 'ritzy-history-summary' },
          createElement(
            'div',
            { className: 'ritzy-summary-card' },
            createElement('span', { className: 'ritzy-metric-label' }, 'Tổng giờ (theo bộ lọc)'),
            createElement('strong', null, formatTotalHours(totalHours)),
            createElement('p', null, 'Tính theo khoảng thời gian bạn đang lọc.')
          ),
          createElement(
            'div',
            { className: 'ritzy-summary-card' },
            createElement('span', { className: 'ritzy-metric-label' }, 'Số phiên'),
            createElement('strong', null, records.length),
            createElement('p', null, 'Tổng số phiên trong bộ lọc.')
          ),
          createElement(
            'div',
            { className: 'ritzy-summary-card' },
            createElement('span', { className: 'ritzy-metric-label' }, 'Trạng thái'),
            createElement('strong', null, status === 'IN' ? 'Đang làm việc' : 'Ngoài ca'),
            createElement('p', null, isViewingSelf ? 'Phiên hiện tại của bạn.' : 'Phiên hiện tại của người bạn đang xem.')
          )
        )
      ),
      createElement(
        'section',
        { className: 'ritzy-panel ritzy-quick-panel' },
        createElement(
          'div',
          { className: 'ritzy-quick-head' },
          createElement(
            'div',
            null,
            createElement('p', { className: 'ritzy-overline' }, 'Chấm công nhanh'),
            createElement(
              'div',
              { className: 'ritzy-quick-title' },
              createElement('h2', { className: 'ritzy-panel-title' }, status === 'IN' ? 'Đang làm việc' : 'Sẵn sàng check-in'),
              createElement(
                'span',
                { className: `ritzy-chip ${status === 'IN' ? 'success' : 'idle'}` },
                status === 'IN' ? 'Đang ghi giờ' : 'Đang chờ'
              )
            ),
            createElement(
              'p',
              { className: 'ritzy-quick-subtitle' },
              !canCheckInOut
                ? 'Bạn đang xem đồng nghiệp, chỉ có thể xem lịch sử và trạng thái.'
                : status === 'IN'
                  ? 'Nhớ check-out khi kết thúc ca để lưu giờ làm của bạn.'
                  : 'Bấm check-in để mở phiên mới ngay lập tức.'
            )
          ),
          createElement(
            'div',
            { className: 'ritzy-quick-actions' },
            status === 'IN'
              ? createElement(
                'button',
                { className: 'ritzy-btn danger', onClick: canCheckInOut ? handleCheckOut : undefined, disabled: isChecking || !canCheckInOut },
                !canCheckInOut ? 'Chỉ xem' : isChecking ? 'Đang xử lý...' : 'Check-out'
              )
              : createElement(
                'button',
                { className: 'ritzy-btn', onClick: canCheckInOut ? handleCheckIn : undefined, disabled: isChecking || !canCheckInOut },
                !canCheckInOut ? 'Chỉ xem' : isChecking ? 'Đang xử lý...' : 'Check-in'
              ),
            createElement(
              'button',
              {
                className: 'ritzy-btn ghost',
                type: 'button',
                onClick: () => fetchAttendance(),
                disabled: isLoading || isChecking
              },
              isLoading ? 'Đang tải...' : 'Làm mới'
            )
          )
        ),
        createElement(
          'div',
          { className: 'ritzy-quick-grid' },
          createElement(
            'div',
            { className: 'ritzy-quick-card' },
            createElement(
              'div',
              { className: 'ritzy-quick-card-top' },
              createElement(
                'div',
                null,
                createElement('p', { className: 'ritzy-overline subtle' }, 'Phiên hiện tại'),
                createElement(
                  'h3',
                  { className: 'ritzy-quick-card-title', suppressHydrationWarning: true },
                  sessionTimerText
                )
              ),
              createElement(
                'div',
                { className: 'ritzy-quick-live' },
                createElement('span', { className: `ritzy-live-dot ${status === 'IN' ? 'active' : 'idle'}` }),
                createElement('span', null, status === 'IN' ? 'Đang ghi giờ' : 'Đang chờ')
              )
            ),
            createElement(
              'p',
              { className: 'ritzy-quick-lead' },
              !canCheckInOut
                ? 'Đang xem chấm công của đồng nghiệp ở cùng cấp. Bạn chỉ xem được dữ liệu.'
                : status === 'IN'
                  ? 'Nhấn Check-out để chốt giờ ngay khi kết thúc ca.'
                  : 'Bạn chưa check-in. Bắt đầu phiên làm việc để ghi nhận thời gian.'
            ),
            null
          ),
          createElement(
            'div',
            { className: 'ritzy-quick-metrics' },
            createElement(
              'div',
              { className: 'ritzy-metric-card' },
              createElement('span', { className: 'ritzy-metric-label' }, 'Phiên hiện tại'),
              createElement(
                'strong',
                { suppressHydrationWarning: true },
                activeRecord ? formatDateTime(activeRecord.checkInTime) : 'Không có'
              ),
              createElement('p', null, status === 'IN' ? 'Đang hoạt động' : 'Chưa check-in')
            ),
            createElement(
              'div',
              { className: 'ritzy-metric-card' },
              createElement('span', { className: 'ritzy-metric-label' }, 'Phiên gần nhất'),
              createElement(
                'strong',
                { suppressHydrationWarning: true },
                lastRecord ? formatDate(new Date(lastRecord.workDate)) : 'Chưa có dữ liệu'
              ),
              createElement(
                'p',
                { suppressHydrationWarning: true },
                lastRecord?.checkOutTime
                  ? `Check-out: ${formatDateTime(lastRecord.checkOutTime)}`
                  : lastRecord
                    ? 'Chưa check-out'
                    : 'Chưa ghi nhận ca làm việc'
              )
            )
          )
        )
      )
    )
  )
}

export default UserDashboardPage
