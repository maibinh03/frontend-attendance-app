'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { USER_ROLES, type User, type UserRole, authUtils } from '@/lib/auth'

interface RequireAuthOptions {
  allowedRoles?: UserRole[]
}

export const useRequireAuth = (options?: RequireAuthOptions): User | null => {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const hasChecked = useRef(false)
  const redirectingRef = useRef(false)

  // Create a stable dependency string from allowedRoles
  const allowedRolesKey = useMemo(() => {
    return options?.allowedRoles?.join(',') ?? ''
  }, [options?.allowedRoles])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Mark as ready after mount to avoid hydration mismatch
    setReady(true)
    
    const currentUser = authUtils.getUser()
    const isAuthenticated = authUtils.isAuthenticated()

    // Update user state
    setUser(currentUser)

    if (redirectingRef.current) return

    if (!isAuthenticated) {
      if (!hasChecked.current) {
        hasChecked.current = true
        redirectingRef.current = true
        router.replace('/login')
      }
      return
    }

    // Check role-based access
    if (options?.allowedRoles && currentUser?.role) {
      if (!options.allowedRoles.includes(currentUser.role)) {
        if (!hasChecked.current) {
          hasChecked.current = true
          redirectingRef.current = true
          if (currentUser.role === USER_ROLES.ADMIN) {
            router.replace('/dashboard/admin')
          } else {
            router.replace('/dashboard/user')
          }
        }
        return
      }
    }

    hasChecked.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedRolesKey])

  // Return null during SSR and before client is ready to avoid hydration mismatch
  if (!ready) return null

  return user
}


