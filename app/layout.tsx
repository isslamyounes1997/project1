import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/app/context/AuthContext'

export const metadata: Metadata = {
  title: 'LTV Dashboard',
  description: 'Klantanalyse dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
