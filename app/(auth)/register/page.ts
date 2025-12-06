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
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
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

        setIsLoading(true)

        try {
            const data = await apiClient.post<AuthResponse>('/api/users/register', {
                username,
                password,
                email,
                fullName
            })

            if (data.success && data.token && data.user) {
                authUtils.setAuth(data.token, data.user)
                if (data.user.role === 'admin') {
                    router.replace('/dashboard/admin')
                } else {
                    router.replace('/dashboard/user')
                }
                return
            }

            setErrorMessage(data.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
        } catch (error) {
            console.error('Register error:', error)
            let message = 'Đã xảy ra lỗi khi kết nối đến server. Vui lòng thử lại.'

            if (error && typeof error === 'object' && 'message' in error && (error as { message?: unknown }).message) {
                message = String((error as { message?: unknown }).message)
            }

            setErrorMessage(message)
        } finally {
            setIsLoading(false)
        }
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
                        createElement('label', { htmlFor: 'fullName' }, 'Họ và tên'),
                        createElement('input', {
                            id: 'fullName',
                            name: 'fullName',
                            type: 'text',
                            value: fullName,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFullName(event.target.value),
                            placeholder: 'Nguyễn Văn A'
                        })
                    ),
                    createElement(
                        'div',
                        { className: 'form-group' },
                        createElement('label', { htmlFor: 'email' }, 'Email'),
                        createElement('input', {
                            id: 'email',
                            name: 'email',
                            type: 'email',
                            value: email,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
                            placeholder: 'email@company.com'
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
                        { className: 'form-group' },
                        createElement('label', { htmlFor: 'confirmPassword' }, 'Xác nhận mật khẩu'),
                        createElement('input', {
                            id: 'confirmPassword',
                            name: 'confirmPassword',
                            type: showPassword ? 'text' : 'password',
                            value: confirmPassword,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value),
                            required: true,
                            minLength: 6
                        })
                    ),
                    createElement(
                        'div',
                        {
                            className: 'login-footer',
                            style: { marginTop: '8px', textAlign: 'center', fontSize: '14px', color: '#666' }
                        },
                        'Đã có tài khoản? ',
                        createElement(Link, { href: '/login', style: { color: '#000', fontWeight: 500 } }, 'Đăng nhập')
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
                createElement('h2', null, 'Bình Boong'),
                createElement('p', null, 'Hệ thống quản lý chấm công của Bình Boong')
            )
        )
    )
}

export default RegisterPage


