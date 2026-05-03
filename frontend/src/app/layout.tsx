import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header' 

export const metadata: Metadata = {
  title: 'CodeStory',
  description: 'Code practice platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body> <Header />{children}</body>
    </html>
  )
}
