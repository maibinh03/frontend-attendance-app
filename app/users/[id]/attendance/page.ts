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

interface PageProps {
  params: { id: string }
}

type MessageState = { type: 'success' | 'error'; text: string } | null

type AttendanceResponse = {
  data?: Attendance[]
  status?: 'IN' | 'OUT'
  activeRecord?: Attendance | null
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

const UserAttendancePage = ({ params }: PageProps): ReactElement => {
  const router = useRouter()
  const currentUser = useRequireAuth()

  const viewedUserId = Number(params.id)
  const [records, setRecords] = useState<Attendance[]>([])
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [activeRecord, setActiveRecord] = useState<Attendance | null>(null)
  const [filters, setFilters] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const messageTimeoutRef = useRef<number | null>(null)

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

  const buildQueryString = useCallback(
    (start?: string, end?: string) => {
      const params = new URLSearchParams({ userId: String(viewedUserId) })
      if (start) params.append('from', start)
      if (end) params.append('to', end)
      return params.toString()
    },
    [viewedUserId]
  )

  const fetchAttendance = useCallback(
    async (payload?: { startDate?: string; endDate?: string }) => {
      if (!currentUser || Number.isNaN(viewedUserId)) return
      setIsLoading(true)
      try {
        const qs = buildQueryString(payload?.startDate ?? filters.startDate, payload?.endDate ?? filters.endDate)
        const res = await apiClient.get<AttendanceResponse>(`/api/attendance?${qs}`)
        const data = res?.data ?? []
        setRecords(data)
        setStatus(res?.status === 'IN' ? 'IN' : 'OUT')
        setActiveRecord(res?.activeRecord ?? null)
      } catch (err) {
        console.error('Error fetching attendance:', err)
        pushMessage({ type: 'error', text: 'Không thể tải dữ liệu chấm công' })
      } finally {
        setIsLoading(false)
      }
    },
    [buildQueryString, currentUser, filters.endDate, filters.startDate, pushMessage, viewedUserId]
  )

  useEffect(() => {
    if (!currentUser) return
    const isSelf = currentUser.id === viewedUserId
    const isPrivileged = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.MANAGER
    if (!isSelf && !isPrivileged) {
      router.replace('/dashboard/user')
      return
    }
    fetchAttendance()
  }, [currentUser, fetchAttendance, router, viewedUserId])

  const handleLogout = useCallback(() => {
    authUtils.clearAuth()
    router.replace('/login')
  }, [router])

  const canCheckInOut = useMemo(() => {
    if (!currentUser) return false
    return currentUser.id === viewedUserId
  }, [currentUser, viewedUserId])

  const handleCheckIn = useCallback(async () => {
    if (!canCheckInOut) return
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
  }, [canCheckInOut, fetchAttendance, pushMessage, status])

  const handleCheckOut = useCallback(async () => {
    if (!canCheckInOut) return
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
  }, [canCheckInOut, fetchAttendance, pushMessage, status])

  const handleFilterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await fetchAttendance(filters)
    },
    [fetchAttendance, filters]
  )

  const handleResetFilters = useCallback(async () => {
    setFilters({ startDate: '', endDate: '' })
    await fetchAttendance({ startDate: '', endDate: '' })
  }, [fetchAttendance])

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
          createElement('p', { className: 'ritzy-brand' }, `Chấm công của user #${viewedUserId}`),
          createElement('p', { className: 'ritzy-greeting' }, 'Xem lịch sử và tổng giờ làm')
        ),
        createElement(
          'div',
          { className: 'ritzy-top-actions' },
          createElement('button', { className: 'ritzy-btn ghost', onClick: () => router.back() }, 'Quay lại'),
          createElement('button', { className: 'ritzy-btn', onClick: handleLogout }, 'Đăng xuất')
        )
      ),
      message ? createElement('div', { className: `ritzy-alert ${message.type}` }, message.text) : null,
      createElement(
        'section',
        { className: 'ritzy-panel' },
        createElement(
          'div',
          { className: 'ritzy-panel-header' },
          createElement(
            'div',
            null,
            createElement('p', { className: 'ritzy-overline' }, 'Trạng thái hiện tại'),
            createElement('h2', { className: 'ritzy-panel-title' }, status === 'IN' ? 'Đang làm việc' : 'Đang rảnh')
          ),
          canCheckInOut
            ? createElement(
              'div',
              { className: 'ritzy-panel-actions' },
              status === 'IN'
                ? createElement(
                  'button',
                  { className: 'ritzy-btn danger', onClick: handleCheckOut, disabled: isChecking },
                  isChecking ? 'Đang xử lý...' : 'Check-out'
                )
                : createElement(
                  'button',
                  { className: 'ritzy-btn', onClick: handleCheckIn, disabled: isChecking },
                  isChecking ? 'Đang xử lý...' : 'Check-in'
                )
            )
            : null
        ),
        !canCheckInOut
          ? createElement(
            'p',
            { className: 'ritzy-subtitle' },
            'Bạn chỉ có thể xem chấm công của người dùng này, không thể check-in/out thay họ.'
          )
          : null,
        createElement(
          'div',
          { className: 'user-status-grid' },
          createElement(
            'div',
            { className: 'user-status-row' },
            createElement('span', null, 'Phiên hiện tại'),
            createElement(
              'strong',
              { suppressHydrationWarning: true },
              activeRecord ? formatDateTime(activeRecord.checkInTime) : 'Không có'
            )
          ),
          createElement(
            'div',
            { className: 'user-status-row' },
            createElement('span', null, 'Tổng giờ (theo bộ lọc)'),
            createElement('strong', null, formatTotalHours(totalHours))
          ),
          createElement(
            'div',
            { className: 'user-status-row' },
            createElement('span', null, 'Số phiên'),
            createElement('strong', null, records.length)
          )
        )
      ),
      createElement(
        'section',
        { className: 'ritzy-panel' },
        createElement(
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
      ),
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
            createElement('h2', { className: 'ritzy-panel-title' }, `Nhật ký của user #${viewedUserId}`)
          ),
          createElement('span', { className: 'ritzy-calendar-chip' }, `${records.length} phiên`)
        ),
        isLoading
          ? createElement('p', { className: 'ritzy-placeholder' }, 'Đang tải dữ liệu...')
          : records.length === 0
            ? createElement('p', { className: 'ritzy-placeholder' }, 'Không có dữ liệu chấm công.')
            : createElement(
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
                  records.map((att) => createElement(HistoryRow, { key: att.id, attendance: att }))
                )
              )
            )
      )
    )
  )
}

export default UserAttendancePage
