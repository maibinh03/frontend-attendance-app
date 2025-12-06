'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createElement, Fragment, useState, type ReactElement } from 'react'
import useAuthRedirect from '@/hooks/useAuthRedirect'
import { authUtils, type AuthResponse } from '@/lib/auth'
import { apiClient } from '@/lib/api'

const LoginPage = (): ReactElement => {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useAuthRedirect()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)
        setIsLoading(true)

        try {
            const data = await apiClient.post<AuthResponse>('/api/users/login', { username, password })
            
            if (data.success && data.token && data.user) {
                authUtils.setAuth(data.token, data.user)
                if (data.user.role === 'admin') {
                    router.replace('/dashboard/admin')
                } else {
                    router.replace('/dashboard/user')
                }
                return
            }

            setErrorMessage(data.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.')
        } catch (error) {
            console.error('Login error:', error)
            // Extract error message from API error
            let errorMessage = 'Đã xảy ra lỗi khi kết nối đến server. Vui lòng thử lại.'
            
            if (error && typeof error === 'object') {
                if ('message' in error && error.message) {
                    errorMessage = String(error.message)
                } else if ('status' in error && error.status === 401) {
                    errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng'
                }
            }
            
            setErrorMessage(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return createElement(
        'div',
        { className: 'login-container' },
        createElement(
            'div',
            { className: 'login-left' },
            createElement(
                'div',
                { className: 'login-content' },
                createElement('h1', null, 'Đăng nhập'),
                createElement('p', { className: 'subtitle' }, 'Hệ thống chấm công'),
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
                    { onSubmit: handleSubmit, className: 'login-form' },
                    createElement(
                        'div',
                        { className: 'form-group' },
                        createElement('label', { htmlFor: 'username' }, 'Tên đăng nhập'),
                        createElement('input', {
                            id: 'username',
                            name: 'username',
                            type: 'text',
                            value: username,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setUsername(event.target.value),
                            required: true
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
                                name: 'password',
                                type: showPassword ? 'text' : 'password',
                                value: password,
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value),
                                required: true
                            }),
                            createElement(
                                'button',
                                {
                                    type: 'button',
                                    'aria-label': 'Toggle password visibility',
                                    className: 'password-toggle',
                                    onClick: () => setShowPassword((prev) => !prev)
                                },
                                showPassword
                                    ? createElement(
                                        Fragment,
                                        null,
                                        createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, createElement('path', { d: 'M1 12S5 4 12 4 23 12 23 12 19 20 12 20 1 12 1 12Z' }), createElement('circle', { cx: 12, cy: 12, r: 3 }), createElement('line', { x1: 1, y1: 1, x2: 23, y2: 23 }))
                                    )
                                    : createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, createElement('path', { d: 'M1 12S5 4 12 4 23 12 23 12 19 20 12 20 1 12 1 12Z' }), createElement('circle', { cx: 12, cy: 12, r: 3 }))
                            )
                        )
                    ),
                    createElement(
                        'div',
                        { className: 'form-options' },
                        createElement(
                            'label',
                            { className: 'checkbox-label' },
                            createElement('input', {
                                type: 'checkbox',
                                checked: rememberMe,
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setRememberMe(event.target.checked)
                            }),
                            createElement('span', null, 'Ghi nhớ đăng nhập')
                        )
                    ),
                    createElement(
                        'div',
                        {
                            className: 'login-footer',
                            style: { marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#666' }
                        },
                        'Chưa có tài khoản? ',
                        createElement(Link, { href: '/register', style: { color: '#000', fontWeight: 500 } }, 'Đăng ký ngay')
                    ),
                    createElement(
                        'button',
                        { type: 'submit', className: 'login-button', disabled: isLoading },
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
                                'Đang đăng nhập...'
                            )
                            : 'Đăng nhập'
                    )
                )
            )
        ),
        createElement(
            'div',
            { className: 'login-right' },
            createElement(
                'div',
                { className: 'brand-section' },
                createElement(
                    'div',
                    { className: 'brand-logo' },
                    createElement('img', { src: '/brand-logo.svg', alt: 'Brand Logo', width: 72, height: 72 })
                ),
                createElement('h2', null, 'Bình Boong'),
                createElement('p', null, 'Hệ thống quản lý chấm công của Bình Boong')
            )
        )
    )
}

export default LoginPage

