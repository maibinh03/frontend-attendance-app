'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createElement, Fragment, useState, type ReactElement } from 'react'
import useAuthRedirect from '@/hooks/useAuthRedirect'
import { authUtils, type AuthResponse } from '@/lib/auth'
import { apiClient } from '@/lib/api'

const RegisterPage = (): ReactElement => {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useAuthRedirect()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setIsLoading(true)

    try {
      const data = await apiClient.post<AuthResponse>('/api/users/register', {
        username,
        password,
        email: email || undefined,
        fullName: fullName || undefined
      })

      if (data.success && data.token && data.user) {
        authUtils.setAuth(data.token, data.user)
        // Redirect based on user role
        if (data.user.role === 'admin') {
          router.replace('/dashboard/admin')
        } else {
          router.replace('/dashboard/user')
        }
      } else {
        setErrorMessage(data.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
      }
    } catch (error) {
      console.error('Register error:', error)
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Đã xảy ra lỗi khi kết nối đến server. Vui lòng thử lại.'
      setErrorMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const createPasswordToggleIcon = (isVisible: boolean) => {
    return isVisible
      ? createElement(
          Fragment,
          null,
          createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, createElement('path', { d: 'M1 12S5 4 12 4 23 12 23 12 19 20 12 20 1 12 1 12Z' }), createElement('circle', { cx: 12, cy: 12, r: 3 }), createElement('line', { x1: 1, y1: 1, x2: 23, y2: 23 }))
        )
      : createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, createElement('path', { d: 'M1 12S5 4 12 4 23 12 23 12 19 20 12 20 1 12 1 12Z' }), createElement('circle', { cx: 12, cy: 12, r: 3 }))
  }

  return createElement(
    'div',
    { className: 'register-container' },
    createElement(
      'div',
      { className: 'register-left' },
      createElement(
        'div',
        { className: 'register-content' },
        createElement('h1', null, 'Đăng ký'),
        createElement('p', { className: 'subtitle' }, 'Tạo tài khoản mới'),
        errorMessage
          ? createElement(
              'div',
              {
                className: 'error-message',
                style: {
                  padding: '12px',
                  marginBottom: '24px',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  fontSize: '14px',
                  border: '1px solid #fcc'
                }
              },
              errorMessage
            )
          : null,
        createElement(
          'form',
          { onSubmit: handleSubmit, className: 'register-form' },
          createElement(
            'div',
            { className: 'form-group' },
            createElement('label', { htmlFor: 'fullName' }, 'Họ và tên'),
            createElement('input', {
              id: 'fullName',
              type: 'text',
              value: fullName,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFullName(event.target.value),
              placeholder: 'Nhập họ và tên của bạn'
            })
          ),
          createElement(
            'div',
            { className: 'form-group' },
            createElement('label', { htmlFor: 'username' }, 'Tên đăng nhập'),
            createElement('input', {
              id: 'username',
              type: 'text',
              value: username,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setUsername(event.target.value),
              placeholder: 'Nhập tên đăng nhập',
              required: true
            })
          ),
          createElement(
            'div',
            { className: 'form-group' },
            createElement('label', { htmlFor: 'email' }, 'Email'),
            createElement('input', {
              id: 'email',
              type: 'email',
              value: email,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
              placeholder: 'Nhập email của bạn'
            })
          ),
          createElement(
            'div',
            { className: 'form-group' },
            createElement('label', { htmlFor: 'password' }, 'Mật khẩu'),
            createElement(
              'div',
              { className: 'password-input-wrapper' },
              createElement('input', {
                id: 'password',
                type: showPassword ? 'text' : 'password',
                value: password,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value),
                placeholder: 'Nhập mật khẩu (tối thiểu 6 ký tự)',
                required: true,
                minLength: 6
              }),
              createElement(
                'button',
                {
                  type: 'button',
                  'aria-label': 'Toggle password visibility',
                  className: 'password-toggle',
                  onClick: () => setShowPassword((prev) => !prev)
                },
                createPasswordToggleIcon(showPassword)
              )
            )
          ),
          createElement(
            'div',
            { className: 'form-group' },
            createElement('label', { htmlFor: 'confirmPassword' }, 'Xác nhận mật khẩu'),
            createElement(
              'div',
              { className: 'password-input-wrapper' },
              createElement('input', {
                id: 'confirmPassword',
                type: showConfirmPassword ? 'text' : 'password',
                value: confirmPassword,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value),
                placeholder: 'Nhập lại mật khẩu',
                required: true
              }),
              createElement(
                'button',
                {
                  type: 'button',
                  'aria-label': 'Toggle confirm password visibility',
                  className: 'password-toggle',
                  onClick: () => setShowConfirmPassword((prev) => !prev)
                },
                createPasswordToggleIcon(showConfirmPassword)
              )
            )
          ),
          createElement(
            'button',
            { type: 'submit', className: 'register-button', disabled: isLoading },
            isLoading
              ? createElement(
                  Fragment,
                  null,
                  createElement(
                    'svg',
                    { className: 'spinner', viewBox: '0 0 24 24' },
                    createElement(
                      'circle',
                      {
                        cx: 12,
                        cy: 12,
                        r: 10,
                        stroke: 'currentColor',
                        strokeWidth: '2',
                        fill: 'none',
                        strokeDasharray: '32',
                        strokeDashoffset: '32'
                      },
                      createElement('animate', { attributeName: 'stroke-dasharray', dur: '1.5s', values: '0 32;16 16;0 32;0 32', repeatCount: 'indefinite' }),
                      createElement('animate', { attributeName: 'stroke-dashoffset', dur: '1.5s', values: '0;-16;-32;-32', repeatCount: 'indefinite' })
                    )
                  ),
                  'Đang đăng ký...'
                )
              : 'Đăng ký'
          ),
          createElement(
            'div',
            {
              className: 'register-footer',
              style: { marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666' }
            },
            'Đã có tài khoản? ',
            createElement(Link, { href: '/login', style: { color: '#000', fontWeight: 500 } }, 'Đăng nhập ngay')
          )
        )
      )
    ),
    createElement(
      'div',
      { className: 'register-right' },
      createElement(
        'div',
        { className: 'brand-section' },
        createElement(
          'div',
          { className: 'brand-logo' },
          createElement('img', { src: '/brand-logo.svg', alt: 'Brand Logo', width: 72, height: 72 })
        ),
        createElement('h2', null, 'Tên Công Ty'),
        createElement('p', null, 'Hệ thống quản lý chấm công của công ty ...')
      )
    )
  )
}

export default RegisterPage

