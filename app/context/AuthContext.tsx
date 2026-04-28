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
  admin:     { pass: 'admin123',  role: 'admin', vestiging: null,                label: 'Admin',           initials: 'AD' },
  amsterdam: { pass: 'pass1',     role: 'fn',    vestiging: 'Amsterdam-Noord',   label: 'Amsterdam-Noord', initials: 'AN' },
  rotterdam: { pass: 'pass2',     role: 'fn',    vestiging: 'Rotterdam-Centrum', label: 'Rotterdam-Centrum', initials: 'RC' },
  utrecht:   { pass: 'pass3',     role: 'fn',    vestiging: 'Utrecht',           label: 'Utrecht',         initials: 'UT' },
  haarlem:   { pass: 'pass4',     role: 'fn',    vestiging: 'Haarlem',           label: 'Haarlem',         initials: 'HA' },
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({ user: null, login: () => false, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('ltv_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const login = (username: string, password: string): boolean => {
    const u = username.toLowerCase().trim()
    const cfg = USERS[u]
    if (cfg && cfg.pass === password) {
      const usr: User = { username: u, ...cfg }
      setUser(usr)
      sessionStorage.setItem('ltv_user', JSON.stringify(usr))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('ltv_user')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
