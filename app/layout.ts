import { createElement, type ReactNode, type ReactElement } from 'react'
import type { Metadata } from 'next'
import './styles/base.css'
import './styles/auth.css'
import './styles/admin-dashboard.css'
import './styles/user-dashboard.css'

// Có nên SEO ở đây không???
export const metadata: Metadata = {
  title: 'Hệ thống chấm công',
  description: 'Ứng dụng chấm công Bình Boong'
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>): ReactElement {
  return createElement(
    'html',
    { lang: 'vi' },
    createElement('body', null, children)
  )
}

