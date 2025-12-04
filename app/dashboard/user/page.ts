'use client'

import { createElement, memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { formatTime, formatDate, formatDateTime, formatTotalHours } from '@/lib/utils/format'
import { INTERVAL_TIMES, MESSAGE_TIMEOUT, ATTENDANCE_HISTORY_LIMIT } from '@/lib/constants'
import { useRequireAuth } from '@/hooks/useRequireAuth'

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

type MessageState = { type: 'success' | 'error'; text: string } | null

const headerButtonStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  alignItems: 'flex-end'
} as const

const HistoryRow = memo<{ attendance: Attendance }>(({ attendance }) => {
  // Format dates only on client side to avoid hydration mismatch
  const formattedWorkDate = typeof window !== 'undefined'
    ? formatDate(new Date(attendance.workDate))
    : ''
  const formattedCheckIn = typeof window !== 'undefined' && attendance.checkInTime
    ? formatDateTime(attendance.checkInTime)
    : '--'
  const formattedCheckOut = typeof window !== 'undefined' && attendance.checkOutTime
    ? formatDateTime(attendance.checkOutTime)
    : '--'

  return createElement(
    'tr',
    null,
    createElement('td', { suppressHydrationWarning: true }, formattedWorkDate),
    createElement('td', { suppressHydrationWarning: true }, formattedCheckIn),
    createElement('td', { suppressHydrationWarning: true }, formattedCheckOut),
    createElement('td', null, formatTotalHours(attendance.totalHours)),
    createElement(
      'td',
      null,
      createElement('span', { className: `ritzy-badge ${attendance.status}` }, attendance.status)
    )
  )
})
HistoryRow.displayName = 'HistoryRow'

const UserDashboardPage = (): ReactElement => {
  const router = useRouter()
  const currentUser = useRequireAuth()
  // Initialize with null to avoid hydration mismatch, set in useEffect
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const lastDateRef = useRef<string>('')
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [isTodayLoading, setIsTodayLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const messageTimeoutRef = useRef<number | null>(null)

  const formattedTime = useMemo(() => currentTime ? formatTime(currentTime) : '--:--', [currentTime])
  const formattedDate = useMemo(() => currentDate ? formatDate(currentDate) : '', [currentDate])

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
    // Initialize time and date on client side to avoid hydration mismatch
    const now = new Date()
    setCurrentTime(now)
    setCurrentDate(now)
    lastDateRef.current = now.toDateString()

    // Update time every minute (only shows hour:minute to reduce lag)
    const timeTimer = window.setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      const nowDateStr = now.toDateString()
      if (nowDateStr !== lastDateRef.current) {
        lastDateRef.current = nowDateStr
        setCurrentDate(now)
      }
    }, INTERVAL_TIMES.TIME_UPDATE)
    return () => window.clearInterval(timeTimer)
  }, [])

  const fetchTodayAttendance = useCallback(async () => {
    if (!currentUser) return
    setIsTodayLoading(true)
    try {
      const data = await apiClient.get<{ data: Attendance | null }>('/api/attendance/today')
      setTodayAttendance(data.data ?? null)
    } catch (err) {
      console.error('Error fetching today attendance:', err)
    } finally {
      setIsTodayLoading(false)
    }
  }, [currentUser])

  const fetchAttendanceHistory = useCallback(async () => {
    if (!currentUser) return
    setIsHistoryLoading(true)
    try {
      const data = await apiClient.get<{ data: Attendance[] }>(`/api/attendance/history?limit=${ATTENDANCE_HISTORY_LIMIT}`)
      setAttendanceHistory(data.data ?? [])
    } catch (err) {
      console.error('Error fetching attendance history:', err)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    fetchTodayAttendance()
  }, [currentUser, fetchTodayAttendance])

  useEffect(() => {
    if (showHistory && currentUser) {
      fetchAttendanceHistory()
    }
  }, [showHistory, currentUser, fetchAttendanceHistory])

  const handleLogout = useCallback((): void => {
    authUtils.clearAuth()
    router.replace('/login')
  }, [router])

  const handleCheckIn = useCallback(async (): Promise<void> => {
    if (!currentUser || todayAttendance) {
      pushMessage({ type: 'error', text: 'Bạn đã chấm công vào hôm nay rồi' })
      return
    }

    setIsChecking(true)
    try {
      await apiClient.post<{ message?: string }>('/api/attendance/checkin', {})
      pushMessage({ type: 'success', text: 'Chấm công vào thành công!' })
      await fetchTodayAttendance()
      if (showHistory) {
        await fetchAttendanceHistory()
      }
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Đã xảy ra lỗi khi chấm công vào'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
    }
  }, [currentUser, todayAttendance, pushMessage, fetchTodayAttendance, fetchAttendanceHistory, showHistory])

  const handleCheckOut = useCallback(async (): Promise<void> => {
    if (!currentUser) return
    if (!todayAttendance) {
      pushMessage({ type: 'error', text: 'Bạn chưa chấm công vào hôm nay' })
      return
    }
    if (todayAttendance.checkOutTime) {
      pushMessage({ type: 'error', text: 'Bạn đã chấm công ra hôm nay rồi' })
      return
    }

    setIsChecking(true)
    try {
      await apiClient.post<{ message?: string }>('/api/attendance/checkout', {})
      pushMessage({ type: 'success', text: 'Chấm công ra thành công!' })
      await fetchTodayAttendance()
      if (showHistory) {
        await fetchAttendanceHistory()
      }
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Đã xảy ra lỗi khi chấm công ra'
      pushMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsChecking(false)
    }
  }, [currentUser, todayAttendance, pushMessage, fetchTodayAttendance, fetchAttendanceHistory, showHistory])

  const toggleHistory = useCallback((): void => {
    setShowHistory((prev) => !prev)
  }, [])

  const todayStatus = useMemo(() => {
    // Format dates only on client side to avoid hydration mismatch
    const checkInValue = typeof window !== 'undefined' && todayAttendance?.checkInTime
      ? formatDateTime(todayAttendance.checkInTime)
      : '--/--'
    const checkOutValue = typeof window !== 'undefined' && todayAttendance?.checkOutTime
      ? formatDateTime(todayAttendance.checkOutTime)
      : '--/--'

    return [
      {
        label: 'Check-in',
        value: checkInValue
      },
      {
        label: 'Check-out',
        value: checkOutValue
      },
      {
        label: 'Tổng giờ',
        value: formatTotalHours(todayAttendance?.totalHours)
      },
      { label: 'Ngày làm', value: formattedDate }
    ]
  }, [todayAttendance, formattedDate])

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
          createElement('p', { className: 'ritzy-subtitle' }, 'Một ngày làm việc vui vẻ hoặc không'),
          currentUser
            ? createElement(
              'p',
              { className: 'ritzy-greeting' },
              'Xin chào, ',
              currentUser.fullName ?? currentUser.username
            )
            : null
        ),
        createElement(
          'div',
          { style: headerButtonStyle },
          createElement('span', { className: 'ritzy-calendar-chip', suppressHydrationWarning: true }, formattedDate),
          createElement('button', { className: 'ritzy-btn', onClick: handleLogout }, 'Đăng xuất')
        )
      ),
      message
        ? createElement('div', { className: `ritzy-alert ${message.type}` }, message.text)
        : null,
      createElement(
        'div',
        { className: 'ritzy-content-grid' },
        createElement(
          'section',
          { className: 'ritzy-hero' },
          createElement('p', { className: 'ritzy-hero-kicker' }, 'Thời gian hệ thống:'),
          createElement('div', { className: 'ritzy-hero-clock', suppressHydrationWarning: true }, formattedTime),
          createElement('p', { className: 'ritzy-hero-caption' }, 'Đồng hồ chấm công'),
          createElement(
            'div',
            { className: 'ritzy-hero-meta' },
            createElement('span', { suppressHydrationWarning: true }, formattedDate),
            createElement(
              'span',
              null,
              todayAttendance ? 'Sẵn sàng hoàn tất ngày làm việc' : 'Đã đến giờ bắt đầu ngày mới'
            ),
            todayAttendance?.checkInTime
              ? createElement('span', { suppressHydrationWarning: true }, `Đã check-in: ${formatDateTime(todayAttendance.checkInTime)}`)
              : null
          )
        ),
        createElement(
          'section',
          { className: 'ritzy-panel' },
          createElement(
            'div',
            { className: 'ritzy-panel-header' },
            createElement(
              'div',
              null,
              createElement('p', { className: 'ritzy-overline' }, 'Hôm nay'),
              createElement('h2', { className: 'ritzy-panel-title' }, 'Trạng thái làm việc')
            )
          ),
          isTodayLoading
            ? createElement('p', { className: 'ritzy-placeholder' }, 'Đang tải thông tin hôm nay...')
            : createElement(
              'div',
              { className: 'user-status-grid' },
              todayStatus.map((item) =>
                createElement(
                  'div',
                  { key: item.label, className: 'user-status-row' },
                  createElement('span', null, item.label),
                  createElement('strong', null, item.value)
                )
              )
            )
        )
      ),
      createElement(
        'div',
        { className: 'ritzy-grid' },
        createElement(
          'article',
          {
            className: `ritzy-action-card ${todayAttendance ? 'disabled' : ''}`,
            'aria-disabled': Boolean(todayAttendance)
          },
          createElement('h3', null, 'Chấm công vào'),
          createElement('p', null, 'Ghi nhận thời điểm bắt đầu làm việc trong ngày.'),
          createElement(
            'button',
            {
              className: 'ritzy-btn block',
              onClick: handleCheckIn,
              disabled: Boolean(todayAttendance) || isChecking
            },
            isChecking ? 'Đang xử lý...' : 'Chấm công vào'
          )
        ),
        createElement(
          'article',
          {
            className: `ritzy-action-card ${!todayAttendance || todayAttendance.checkOutTime ? 'disabled' : ''}`,
            'aria-disabled': !todayAttendance || Boolean(todayAttendance?.checkOutTime)
          },
          createElement('h3', null, 'Chấm công ra'),
          createElement('p', null, 'Hoàn tất phiên làm việc và tính tổng giờ.'),
          createElement(
            'button',
            {
              className: 'ritzy-btn block',
              onClick: handleCheckOut,
              disabled: !todayAttendance || Boolean(todayAttendance.checkOutTime) || isChecking
            },
            isChecking ? 'Đang xử lý...' : 'Chấm công ra'
          )
        ),
        createElement(
          'article',
          { className: 'ritzy-action-card' },
          createElement('h3', null, 'Lịch sử chấm công'),
          createElement('p', null, 'Xem 10 bản ghi gần nhất của bạn.'),
          createElement(
            'button',
            { className: 'ritzy-btn ghost block', onClick: toggleHistory },
            showHistory ? 'Thu gọn lịch sử' : 'Xem lịch sử'
          )
        )
      ),
      showHistory
        ? createElement(
          'section',
          { className: 'ritzy-history' },
          createElement(
            'header',
            null,
            createElement(
              'div',
              null,
              createElement('p', { className: 'ritzy-overline' }, 'Lịch sử'),
              createElement('h2', { className: 'ritzy-panel-title' }, 'Nhật ký chấm công')
            ),
            createElement('span', { className: 'ritzy-calendar-chip' }, `${attendanceHistory.length} bản ghi`)
          ),
          isHistoryLoading
            ? createElement('p', { className: 'ritzy-placeholder' }, 'Đang tải lịch sử...')
            : attendanceHistory.length === 0
              ? createElement('p', { className: 'ritzy-placeholder' }, 'Bạn chưa có lịch sử chấm công.')
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
                    attendanceHistory.map((att) => createElement(HistoryRow, { key: att.id, attendance: att }))
                  )
                )
              )
        )
        : null
    )
  )
}

export default UserDashboardPage

