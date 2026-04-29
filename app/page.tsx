'use client'
import { useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/login'
    }
  }, [user])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 12px' }}>📊</div>
        <div style={{ fontSize: 13, color: '#6b62a0' }}>Laden...</div>
      </div>
    </div>
  )
}
