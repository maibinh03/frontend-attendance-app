'use client'

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export interface User {
  id: number
  username: string
  email?: string
  fullName?: string
  role?: UserRole
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  message?: string
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const authUtils = {
  setAuth: (token: string, user: User): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Error saving auth to localStorage:', error)
    }
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error('Error reading token from localStorage:', error)
      return null
    }
  },

  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr) return null
      return JSON.parse(userStr) as User
    } catch (error) {
      console.error('Error reading user from localStorage:', error)
      return null
    }
  },

  isAuthenticated: (): boolean => {
    return !!authUtils.getToken()
  },

  clearAuth: (): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (error) {
      console.error('Error clearing auth from localStorage:', error)
    }
  },

  getAuthHeader: (): { Authorization: string } | Record<string, never> => {
    const token = authUtils.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  handleAuthError: (response: Response): boolean => {
    if (response.status === 401) {
      authUtils.clearAuth()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return true
    }
    return false
  }
}


