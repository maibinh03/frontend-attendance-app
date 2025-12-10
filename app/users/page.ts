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

const ui = {
  page: 'min-h-screen bg-gray-50 text-gray-900',
  shell: 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6',
  topBar:
    'bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 min-h-[140px] flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between',
  brand: 'text-3xl font-bold leading-tight text-gray-900',
  greeting: 'text-lg text-gray-600',
  topActions: 'flex flex-wrap items-center gap-3',
  panel: 'bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5',
  panelHeader: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
  overline: 'text-xs uppercase tracking-wide text-gray-500 font-semibold',
  panelTitle: 'text-xl font-semibold text-gray-900',
  panelActions: 'flex flex-wrap items-center gap-3',
  subtitle:
    'text-sm text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4',
  statusGrid: 'grid grid-cols-1 sm:grid-cols-3 gap-4',
  statusRow:
    'flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700',
  filterForm: 'space-y-4',
  filterGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  filterActions: 'flex items-center gap-3',
  filterNudge:
    'hidden sm:inline-flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 w-fit ml-auto animate-pulse',
  history: 'bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4',
  calendarChip:
    'inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100',
  placeholder:
    'text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center',
  tableWrapper: 'overflow-x-auto',
  historyTable: 'min-w-full text-sm text-left border-collapse',
  tableHead: 'bg-gray-50',
  tableHeadCell: 'px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide',
  tableRow: 'border-b border-gray-100 last:border-0',
  tableData: 'px-4 py-3 align-middle text-gray-800',
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
  alert: 'rounded-xl border p-4 text-sm font-medium'
}

const buttonClasses = {
  base: 'inline-flex items-center justify-center rounded-lg border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
  primary: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500',
  ghost: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-500 focus:ring-red-500'
}

const alertClass = (type: 'success' | 'error'): string => {
  if (type === 'success') {
    return `${ui.alert} bg-emerald-50 border-emerald-200 text-emerald-700`
  }
  return `${ui.alert} bg-red-50 border-red-200 text-red-700`
}

const badgeClass = (status: string): string => {
  if (status === 'IN') {
    return `${ui.badge} bg-emerald-50 text-emerald-700 border-emerald-200`
  }
  if (status === 'OUT') {
    return `${ui.badge} bg-gray-100 text-gray-700 border-gray-200`
  }
  return `${ui.badge} bg-blue-50 text-blue-700 border-blue-200`
}

const HistoryRow = memo<{ attendance: Attendance }>(({ attendance }) =>
  createElement(
    'tr',
    { className: ui.tableRow },
    createElement(
      'td',
      { suppressHydrationWarning: true, className: ui.tableData },
      formatDate(new Date(attendance.workDate))
    ),
    createElement(
      'td',
      { suppressHydrationWarning: true, className: ui.tableData },
      attendance.checkInTime ? formatDateTime(attendance.checkInTime) : '--'
    ),
    createElement(
      'td',
      { suppressHydrationWarning: true, className: ui.tableData },
      attendance.checkOutTime ? formatDateTime(attendance.checkOutTime) : '--'
    ),
    createElement('td', { className: ui.tableData }, formatTotalHours(attendance.totalHours ?? null)),
    createElement('td', { className: ui.tableData }, createElement('span', { className: badgeClass(attendance.status) }, attendance.status))
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
  const [showFilterNudge, setShowFilterNudge] = useState(false)


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

  const handleHistoryMouseEnter = useCallback(() => {
    setShowFilterNudge(true)
  }, [])

  const handleHistoryMouseLeave = useCallback(() => {
    setShowFilterNudge(false)
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
    { className: ui.page },
    createElement(
      'div',
      { className: ui.shell },
      createElement(
        'header',
        { className: ui.topBar },
        createElement(
          'div',
          { className: 'space-y-1' },
          createElement('p', { className: ui.brand }, `Chấm công của user #${viewedUserId}`),
          createElement('p', { className: ui.greeting }, 'Xem lịch sử và tổng giờ làm')
        ),
        createElement(
          'div',
          { className: ui.topActions },
          createElement(
            'button',
            { className: `${buttonClasses.base} ${buttonClasses.ghost}`, onClick: () => router.back() },
            'Quay lại'
          ),
          createElement(
            'button',
            { className: `${buttonClasses.base} ${buttonClasses.primary}`, onClick: handleLogout },
            'Đăng xuất'
          )
        )
      ),
      message ? createElement('div', { className: alertClass(message.type) }, message.text) : null,
      createElement(
        'section',
        { className: ui.panel },
        createElement(
          'div',
          { className: ui.panelHeader },
          createElement(
            'div',
            null,
            createElement('p', { className: ui.overline }, 'Trạng thái hiện tại'),
            createElement('h2', { className: ui.panelTitle }, status === 'IN' ? 'Đang làm việc' : 'Đang rảnh')
          ),
          canCheckInOut
            ? createElement(
              'div',
              { className: ui.panelActions },
              status === 'IN'
                ? createElement(
                  'button',
                  {
                    className: `${buttonClasses.base} ${buttonClasses.danger}`,
                    onClick: handleCheckOut,
                    disabled: isChecking
                  },
                  isChecking ? 'Đang xử lý...' : 'Check-out'
                )
                : createElement(
                  'button',
                  {
                    className: `${buttonClasses.base} ${buttonClasses.primary}`,
                    onClick: handleCheckIn,
                    disabled: isChecking
                  },
                  isChecking ? 'Đang xử lý...' : 'Check-in'
                )
            )
            : null
        ),
        !canCheckInOut
          ? createElement(
            'p',
            { className: ui.subtitle },
            'Bạn chỉ có thể xem chấm công của người dùng này, không thể check-in/out thay họ.'
          )
          : null,
        createElement(
          'div',
          { className: ui.statusGrid },
          createElement(
            'div',
            { className: ui.statusRow },
            createElement('span', null, 'Phiên hiện tại'),
            createElement(
              'strong',
              { suppressHydrationWarning: true },
              activeRecord ? formatDateTime(activeRecord.checkInTime) : 'Không có'
            )
          ),
          createElement(
            'div',
            { className: ui.statusRow },
            createElement('span', null, 'Tổng giờ (theo bộ lọc)'),
            createElement('strong', null, formatTotalHours(totalHours))
          ),
          createElement(
            'div',
            { className: ui.statusRow },
            createElement('span', null, 'Số phiên'),
            createElement('strong', null, records.length)
          )
        )
      ),
      showFilterNudge
        ? createElement(
          'div',
          { className: ui.filterNudge },
          createElement('span', null, 'Bộ lọc nằm ở đây →')
        )
        : null,
      createElement(
        'section',
        { className: ui.panel },
        createElement(
          'form',
          { className: ui.filterForm, onSubmit: handleFilterSubmit },
          createElement(
            'div',
            { className: ui.filterGrid },
            createElement(
              'label',
              { className: 'space-y-1 text-sm text-gray-700' },
              'Start date',
              createElement('input', {
                type: 'date',
                value: filters.startDate,
                onChange: (e) => setFilters((prev) => ({ ...prev, startDate: e.target.value })),
                className:
                  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              })
            ),
            createElement(
              'label',
              { className: 'space-y-1 text-sm text-gray-700' },
              'End date',
              createElement('input', {
                type: 'date',
                value: filters.endDate,
                onChange: (e) => setFilters((prev) => ({ ...prev, endDate: e.target.value })),
                className:
                  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              })
            )
          ),
          createElement(
            'div',
            { className: ui.filterActions },
            createElement(
              'button',
              { type: 'submit', className: `${buttonClasses.base} ${buttonClasses.primary}`, disabled: isLoading },
              isLoading ? 'Đang lọc...' : 'Áp dụng'
            ),
            createElement(
              'button',
              {
                type: 'button',
                className: `${buttonClasses.base} ${buttonClasses.ghost}`,
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
        {
          className: ui.history,
          onMouseEnter: handleHistoryMouseEnter,
          onMouseLeave: handleHistoryMouseLeave
        },
        createElement(
          'header',
          { className: 'flex items-start justify-between gap-3 flex-wrap' },
          createElement(
            'div',
            null,
            createElement('p', { className: ui.overline }, 'Lịch sử chấm công'),
            createElement('h2', { className: ui.panelTitle }, `Nhật ký của user #${viewedUserId}`)
          ),
          createElement('span', { className: ui.calendarChip }, `${records.length} phiên`)
        ),
        isLoading
          ? createElement('p', { className: ui.placeholder }, 'Đang tải dữ liệu...')
          : records.length === 0
            ? createElement('p', { className: ui.placeholder }, 'Không có dữ liệu chấm công.')
            : createElement(
              'div',
              { className: ui.tableWrapper },
              createElement(
                'table',
                { className: ui.historyTable },
                createElement(
                  'thead',
                  { className: ui.tableHead },
                  createElement(
                    'tr',
                    null,
                    createElement('th', { className: ui.tableHeadCell }, 'Ngày'),
                    createElement('th', { className: ui.tableHeadCell }, 'Check-in'),
                    createElement('th', { className: ui.tableHeadCell }, 'Check-out'),
                    createElement('th', { className: ui.tableHeadCell }, 'Tổng giờ'),
                    createElement('th', { className: ui.tableHeadCell }, 'Trạng thái')
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
