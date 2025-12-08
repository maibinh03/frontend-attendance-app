'use client'

import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type ReactElement
} from 'react'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { USER_ROLES, authUtils } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { formatDate, formatHours } from '@/lib/utils/format'
import { INTERVAL_TIMES, STATISTICS_DAYS } from '@/lib/constants'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface User {
  id: number
  username: string
  email?: string
  fullName?: string
  role: string
}

interface AttendanceStatistics {
  totalRecords?: number
  totalHours?: number
  averageHours?: number
  checkedOutCount?: number
}

const UserRow = memo<{ user: User }>(({ user }) =>
  createElement(
    'tr',
    null,
    createElement('td', null, user.id),
    createElement('td', null, user.username),
    createElement('td', null, user.fullName ?? '-'),
    createElement('td', null, user.email ?? '-'),
    createElement(
      'td',
      null,
      createElement('span', { className: `admin-badge ${user.role}` }, user.role)
    )
  )
)
UserRow.displayName = 'UserRow'

const AdminDashboardPage = (): ReactElement => {
  const router = useRouter()
  const currentUser = useRequireAuth({ allowedRoles: [USER_ROLES.ADMIN] })

  const [mounted, setMounted] = useState(false) // ⬅ fix hydration cho user info
  const [formattedDate, setFormattedDate] = useState('') // ⬅ fix hydration cho date

  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shouldLoadStats, setShouldLoadStats] = useState(false)
  const lastDateRef = useRef<string>('')

  useEffect(() => {
    setMounted(true)
    const now = new Date()
    lastDateRef.current = now.toDateString()
    setFormattedDate(formatDate(now))

    const timer = window.setInterval(() => {
      const now = new Date()
      if (now.toDateString() !== lastDateRef.current) {
        lastDateRef.current = now.toDateString()
        setFormattedDate(formatDate(now))
      }
    }, INTERVAL_TIMES.DATE_CHECK)

    return () => clearInterval(timer)
  }, [])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const isResponseWithMeta = (
        val: unknown
      ): val is { success?: boolean; data?: User[] } =>
        typeof val === 'object' && val !== null && !Array.isArray(val)

      const response = await apiClient.get<{ success?: boolean; data?: User[] } | User[]>('/api/users')
      const arr = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data ?? [] : []

      if (isResponseWithMeta(response) && response.success === false) {
        setError('Không thể tải danh sách người dùng')
      }

      setUsers(arr)

      if (arr.length > 0 && !shouldLoadStats) {
        setShouldLoadStats(true)
      }
    } catch (err) {
      console.error(err)
      setError('Không thể tải danh sách người dùng')
    } finally {
      setIsLoading(false)
    }
  }, [shouldLoadStats])

  const loadStatistics = useCallback(async () => {
    setStatsLoading(true)

    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - STATISTICS_DAYS)

      const data = await apiClient.get<{ data: AttendanceStatistics | null }>(
        `/api/attendance/statistics?startDate=${start
          .toISOString()
          .split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`
      )

      setStatistics(data.data ?? null)
    } catch (err) {
      console.error(err)
      setStatistics(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (shouldLoadStats) loadStatistics()
  }, [shouldLoadStats, loadStatistics])

  useEffect(() => {
    if (!currentUser) return
    loadUsers()
  }, [currentUser, loadUsers])

  const adminCount = users.filter((u) => u.role === 'admin').length
  const employeeCount = users.filter((u) => u.role === 'user').length

  const handleLogout = useCallback(() => {
    authUtils.clearAuth()
    router.replace('/login')
  }, [router])

  const statCards = useMemo(() => {
    if (!statistics) return []

    return [
      { label: 'Tổng bản ghi', value: statistics.totalRecords ?? 0, icon: '📊' },
      { label: 'Tổng giờ làm việc', value: formatHours(statistics.totalHours), icon: '⏱️' },
      { label: 'Trung bình giờ/ngày', value: formatHours(statistics.averageHours), icon: '📈' },
      { label: 'Đã chấm công ra', value: statistics.checkedOutCount ?? 0, icon: '✅' }
    ]
  }, [statistics])

  const orgStats = [
    { label: 'Tổng người dùng', value: users.length, icon: '👥' },
    { label: 'Quản trị viên', value: adminCount, icon: '👑' },
    { label: 'Nhân viên', value: employeeCount, icon: '💼' }
  ]

  return createElement(
    'div',
    { className: 'admin-dashboard' },
    createElement(
      'div',
      { className: 'admin-shell' },

      // HEADER
      createElement(
        'header',
        { className: 'admin-header' },
        createElement(
          'div',
          { className: 'admin-header-left' },
          createElement('h1', null, 'Bảng Điều Khiển Admin'),
          createElement('p', { className: 'subtitle' }, 'Quản lý hệ thống chấm công'),

          // ⬅ Fix hydration: chỉ render user greeting khi đã mounted
          mounted && currentUser
            ? createElement(
              'p',
              { className: 'greeting' },
              'Xin chào, ',
              currentUser.fullName ?? currentUser.username
            )
            : null
        ),
        createElement(
          'div',
          { className: 'admin-header-right' },

          // ⬅ Fix hydration: chỉ render date khi mounted
          mounted
            ? createElement('span', { className: 'admin-date-chip' }, formattedDate)
            : createElement('span', { className: 'admin-date-chip' }, '--'),

          createElement('button', { className: 'admin-btn', onClick: handleLogout }, 'Đăng xuất')
        )
      ),

      error ? createElement('div', { className: 'admin-alert error' }, error) : null,

      /* Các phần còn lại giữ nguyên không ảnh hưởng hydration */
      createElement(
        'section',
        { className: 'admin-panel' },
        createElement(
          'div',
          { className: 'admin-panel-header' },
          createElement(
            'div',
            null,
            createElement('h2', { className: 'admin-panel-title' }, 'Tổng quan tổ chức'),
            createElement('p', { className: 'admin-panel-subtitle' }, 'Thống kê nhân sự')
          ),
          createElement(
            'button',
            { className: 'admin-btn secondary', onClick: loadUsers, disabled: isLoading },
            isLoading
              ? createElement(
                Fragment,
                null,
                createElement('span', { className: 'admin-loading', style: { marginRight: '8px' } }),
                'Đang tải...'
              )
              : '🔄 Làm mới'
          )
        ),

        createElement(
          'div',
          { className: 'admin-stats-grid' },
          orgStats.map((stat) =>
            createElement(
              'div',
              { key: stat.label, className: 'admin-stat-card' },
              createElement('p', { className: 'admin-stat-label' }, `${stat.icon} ${stat.label}`),
              createElement('p', { className: 'admin-stat-value' }, stat.value)
            )
          )
        )
      ),

      // THỐNG KÊ CHẤM CÔNG
      createElement(
        'section',
        { className: 'admin-panel' },
        createElement(
          'div',
          { className: 'admin-panel-header' },
          createElement(
            'div',
            null,
            createElement('h2', { className: 'admin-panel-title' }, 'Thống kê chấm công'),
            createElement('p', { className: 'admin-panel-subtitle' }, `${STATISTICS_DAYS} ngày gần nhất`)
          ),
          createElement(
            'button',
            { className: 'admin-btn secondary', onClick: loadStatistics, disabled: statsLoading },
            statsLoading
              ? createElement(
                Fragment,
                null,
                createElement('span', { className: 'admin-loading', style: { marginRight: '8px' } }),
                'Đang tải...'
              )
              : '🔄 Cập nhật'
          )
        ),

        statsLoading
          ? createElement('p', { className: 'admin-placeholder' }, 'Đang tổng hợp dữ liệu...')
          : null,

        !statsLoading && statistics && statCards.length > 0
          ? createElement(
            'div',
            { className: 'admin-stats-grid' },
            statCards.map((card) =>
              createElement(
                'div',
                { key: card.label, className: 'admin-stat-card' },
                createElement('p', { className: 'admin-stat-label' }, `${card.icon} ${card.label}`),
                createElement(
                  'p',
                  { className: `admin-stat-value ${typeof card.value === 'string' ? 'small' : ''}` },
                  card.value
                )
              )
            )
          )
          : null,

        !statsLoading && !statistics
          ? createElement('p', { className: 'admin-placeholder' }, 'Chưa có dữ liệu thống kê.')
          : null
      ),

      // DANH SÁCH NGƯỜI DÙNG
      createElement(
        'section',
        { className: 'admin-panel' },
        createElement(
          'div',
          { className: 'admin-panel-header' },
          createElement(
            'div',
            null,
            createElement('h2', { className: 'admin-panel-title' }, 'Danh sách người dùng'),
            createElement('p', { className: 'admin-panel-subtitle' }, 'Quản lý tài khoản hệ thống')
          ),
          createElement(
            'button',
            { className: 'admin-btn secondary', onClick: loadUsers, disabled: isLoading },
            isLoading
              ? createElement(
                Fragment,
                null,
                createElement('span', { className: 'admin-loading', style: { marginRight: '8px' } }),
                'Đang tải...'
              )
              : '🔄 Làm mới'
          )
        ),

        isLoading
          ? createElement('p', { className: 'admin-placeholder' }, 'Đang tải danh sách người dùng...')
          : createElement(
            'div',
            { className: 'admin-table-wrapper' },
            createElement(
              'table',
              { className: 'admin-table' },
              createElement(
                'thead',
                null,
                createElement(
                  'tr',
                  null,
                  createElement('th', null, 'ID'),
                  createElement('th', null, 'Tên đăng nhập'),
                  createElement('th', null, 'Họ tên'),
                  createElement('th', null, 'Email'),
                  createElement('th', null, 'Vai trò')
                )
              ),
              createElement(
                'tbody',
                null,
                users.length === 0
                  ? createElement(
                    'tr',
                    null,
                    createElement(
                      'td',
                      { colSpan: 5 },
                      createElement('div', { className: 'admin-placeholder' }, 'Chưa có người dùng nào')
                    )
                  )
                  : users.map((u) => createElement(UserRow, { key: u.id, user: u }))
              )
            )
          )
      )
    )
  )
}

export default AdminDashboardPage
