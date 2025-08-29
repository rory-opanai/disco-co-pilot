import './globals.css'
import React from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <div className="max-w-6xl mx-auto p-4">{children}</div>
      </body>
    </html>
  )
}

