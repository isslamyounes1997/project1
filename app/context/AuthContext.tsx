'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type User = {
  username: string
  role: 'admin' | 'fn'
  vestiging: string | null
  label: string
  initials: string
}

const USERS: Record<string, { pass: string; role: 'admin' | 'fn'; vestiging: string | null; label: string; initials: string }> = {
  admin:     { pass: 'admin123',  role: 'admin', vestiging: null,                label: 'Admin',             initials: 'AD' },
  amsterdam: { pass: 'pass1',     role: 'fn',    vestiging: 'Amsterdam-Noord',   label: 'Amsterdam-Noord',   initials: 'AN' },
  rotterdam: { pass: 'pass2',     role: 'fn',    vestiging: 'Rotterdam-Centrum', label: 'Rotterdam-Centrum', initials: 'RC' },
  utrecht:   { pass: 'pass3',     role: 'fn',    vestiging: 'Utrecht',           label: 'Utrecht',           initials: 'UT' },
  haarlem:   { pass: 'pass4',     role: 'fn',    vestiging: 'Haarlem',           label: 'Haarlem',           initials: 'HA' },
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({ user: null, login: () => false, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = getCookie('ltv_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setReady(true)
  }, [])

  const login = (username: string, password: string): boolean => {
    const u = username.toLowerCase().trim()
    const cfg = USERS[u]
    if (cfg && cfg.pass === password) {
      const usr: User = { username: u, ...cfg }
      setUser(usr)
      setCookie('ltv_user', JSON.stringify(usr), 30)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    deleteCookie('ltv_user')
    window.location.href = '/login'
  }

  // Toon niets totdat cookies geladen zijn — voorkomt flash van loginpagina
  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 12px' }}>📊</div>
        <div style={{ fontSize: 13, color: '#6b62a0' }}>Laden...</div>
      </div>
    </div>
  )

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
