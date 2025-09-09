import './globals.css'
import React from 'react'
import dynamic from 'next/dynamic'
import { Inter } from 'next/font/google'

// Load modern sans font
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

// NavBar is client-only
const NavBar = dynamic(() => import('../components/NavBar'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[color:var(--bg-canvas)] text-slate-900 min-h-screen font-sans">
        <NavBar />
        <div className="max-w-7xl mx-auto p-4">{children}</div>
      </body>
    </html>
  )
}
