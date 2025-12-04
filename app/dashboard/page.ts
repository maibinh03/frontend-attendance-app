'use client'

import { createElement, useEffect, useRef, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { USER_ROLES, authUtils } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DashboardLanding = (): ReactElement => {
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (hasRedirected.current) return
    
    if (!authUtils.isAuthenticated()) {
      hasRedirected.current = true
      router.replace('/login')
      return
    }
    
    hasRedirected.current = true
    const user = authUtils.getUser()
    if (user?.role === USER_ROLES.ADMIN) {
      router.replace('/dashboard/admin')
    } else {
      router.replace('/dashboard/user')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createElement(
    'div',
    { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    createElement('p', null, 'Đang chuyển hướng...')
  )
}

export default DashboardLanding

