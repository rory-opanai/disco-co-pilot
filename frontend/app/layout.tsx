import './globals.css'
import React from 'react'
import dynamic from 'next/dynamic'

// NavBar is client-only
const NavBar = dynamic(() => import('../components/NavBar'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <NavBar />
        <div className="max-w-6xl mx-auto p-4">{children}</div>
      </body>
    </html>
  )
}
