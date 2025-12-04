'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { USER_ROLES, authUtils } from '@/lib/auth'

const useAuthRedirect = (redirectTo?: string): void => {
  const router = useRouter()
  const hasRedirected = useRef(false)

  // Normalize redirectTo to always be a string (empty string if undefined)
  const redirectToKey = useMemo(() => redirectTo ?? '', [redirectTo])

  useEffect(() => {
    if (hasRedirected.current) return
    if (!authUtils.isAuthenticated()) return

    hasRedirected.current = true

    if (redirectToKey) {
      router.replace(redirectToKey)
      return
    }

    const user = authUtils.getUser()
    if (user?.role === USER_ROLES.ADMIN) {
      router.replace('/dashboard/admin')
    } else {
      router.replace('/dashboard/user')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectToKey])
}

export default useAuthRedirect


