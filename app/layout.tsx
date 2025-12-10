import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { ThemeProviderWrapper } from '@/components/ThemeProviderWrapper'
import './globals.css'
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
}>) {
  return (
    <html lang= "vi" >
    <body>
    <ThemeProviderWrapper>
    { children }
    </ThemeProviderWrapper>
    </body>
    </html>
  )
}

