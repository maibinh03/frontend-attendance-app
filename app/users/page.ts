'use client'

import { createElement, useCallback, useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export const dynamic = 'force-dynamic'

interface UserRow {
  id: number
  username: string
  fullName?: string
  email?: string
  role?: string
}

const UsersPage = (): ReactElement => {
  const router = useRouter()
  useRequireAuth({ allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER] })

  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ data?: UserRow[] }>('/api/users')
      setUsers(res?.data ?? [])
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Không thể tải danh sách người dùng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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
          createElement('p', { className: 'ritzy-brand' }, 'Danh sách người dùng'),
          createElement('p', { className: 'ritzy-subtitle' }, 'Dành cho admin và manager')
        ),
        createElement(
          'div',
          { className: 'ritzy-top-actions' },
          createElement('button', { className: 'ritzy-btn ghost', onClick: () => router.back() }, 'Quay lại')
        )
      ),
      error ? createElement('div', { className: 'ritzy-alert error' }, error) : null,
      createElement(
        'section',
        { className: 'ritzy-panel' },
        isLoading
          ? createElement('p', { className: 'ritzy-placeholder' }, 'Đang tải danh sách...')
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
                  createElement('th', null, 'ID'),
                  createElement('th', null, 'Tên đăng nhập'),
                  createElement('th', null, 'Họ tên'),
                  createElement('th', null, 'Email'),
                  createElement('th', null, 'Vai trò'),
                  createElement('th', null, '')
                )
              ),
              createElement(
                'tbody',
                null,
                users.length === 0
                  ? createElement(
                    'tr',
                    null,
                    createElement('td', { colSpan: 6 }, createElement('div', { className: 'ritzy-placeholder' }, 'Chưa có người dùng'))
                  )
                  : users.map((user) =>
                    createElement(
                      'tr',
                      { key: user.id },
                      createElement('td', null, user.id),
                      createElement('td', null, user.username),
                      createElement('td', null, user.fullName ?? '--'),
                      createElement('td', null, user.email ?? '--'),
                      createElement(
                        'td',
                        null,
                        createElement('span', { className: `ritzy-badge ${user.role ?? ''}` }, user.role ?? 'user')
                      ),
                      createElement(
                        'td',
                        null,
                        createElement(
                          'button',
                          { className: 'ritzy-btn ghost', onClick: () => router.push(`/users/${user.id}/attendance`) },
                          'Xem chấm công'
                        )
                      )
                    )
                  )
              )
            )
          )
      )
    )
  )
}

export default UsersPage
