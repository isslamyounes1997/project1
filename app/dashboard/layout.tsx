'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { useData } from '@/app/context/DataContext'
import { AuthProvider } from '@/app/context/AuthContext'
import { DataProvider } from '@/app/context/DataContext'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { loadFromServer, loading } = useData()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) { window.location.href = '/login'; return }
    loadFromServer()
  }, [user])

  if (!user) return null

  const nav = [
    { href: '/dashboard', label: 'Overzicht', icon: '▦', exact: true },
    { href: '/dashboard/klanten', label: 'Klanten', icon: '👥' },
    { href: '/dashboard/vestigingen', label: 'Vestigingen', icon: '🏪', adminOnly: true },
    { href: '/dashboard/cohort', label: 'Cohortanalyse', icon: '📊', adminOnly: true },
    { href: '/dashboard/import', label: 'CSV importeren', icon: '📂' },
    { href: '/dashboard/geschiedenis', label: 'Importgeschiedenis', icon: '🕐' },
    { href: '/dashboard/ai', label: '✨ AI Assistent', icon: '' },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) && href !== '/dashboard'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: '#fff', borderRight: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1.5rem 1.25rem', borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.3px' }}>LTV Dashboard</div>
        </div>

        <div style={{ padding: '1rem 0', flex: 1 }}>
          <div style={{ padding: '0 1.25rem', marginBottom: '.4rem', marginTop: '.6rem', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)' }}>Analyse</div>
          {nav.filter(n => !n.adminOnly || user.role === 'admin').map(n => {
            const active = isActive(n.href, n.exact) || (n.href === '/dashboard' && pathname === '/dashboard')
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.25rem',
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? 'var(--accent)' : 'var(--text2)',
                background: active ? 'linear-gradient(135deg,rgba(108,63,255,.1),rgba(255,79,200,.08))' : 'transparent',
                borderRadius: 10, margin: '2px 10px', textDecoration: 'none', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                {n.label}
                {n.href === '/dashboard/import' && (
                  <div style={{ marginLeft: 4, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }} />
                )}
              </Link>
            )
          })}
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1.5px solid var(--border)' }}>
          <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 12, transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.role === 'admin' ? 'linear-gradient(135deg,#6c3fff,#ff4fc8)' : 'linear-gradient(135deg,#00c98d,#00bcd4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {user.initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.role === 'admin' ? 'Admin' : user.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user.role === 'admin' ? 'Alle vestigingen' : user.vestiging}</div>
            </div>
            <span style={{ opacity: .4, fontSize: 14 }}>→</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 240, padding: '2.5rem', flex: 1, minHeight: '100vh' }}>
        {loading && (
          <div style={{ position: 'fixed', top: 16, right: 16, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--accent)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'dotPulse 1.2s infinite' }} />
            Data laden...
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <DashboardContent>{children}</DashboardContent>
      </DataProvider>
    </AuthProvider>
  )
}
