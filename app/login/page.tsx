'use client'
import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

const DEMO = [
  { user: 'admin', pass: 'admin123', label: '✨ Admin', type: 'admin' },
  { user: 'amsterdam', pass: 'pass1', label: 'Amsterdam-Noord', type: 'fn' },
  { user: 'rotterdam', pass: 'pass2', label: 'Rotterdam-Centrum', type: 'fn' },
  { user: 'utrecht', pass: 'pass3', label: 'Utrecht', type: 'fn' },
  { user: 'haarlem', pass: 'pass4', label: 'Haarlem', type: 'fn' },
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()

  const doLogin = () => {
    if (login(username, password)) {
      window.location.href = '/dashboard'
    } else {
      setError('Gebruikersnaam of wachtwoord onjuist')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f7f4ff 0%, #ffe8f8 50%, #e8f4ff 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,63,255,.15),transparent 70%)', top: -150, right: -150, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,201,141,.12),transparent 70%)', bottom: -100, left: -100, pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 400, background: '#fff',
        border: '1.5px solid #e2dcf8', borderRadius: 24,
        padding: '2.5rem', boxShadow: '0 20px 60px rgba(108,63,255,.12)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>LTV Dashboard</div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welkom terug! 👋</div>
        <div style={{ fontSize: 13, color: '#6b62a0', marginBottom: '2rem', lineHeight: 1.6 }}>Log in om je klantendata te bekijken.</div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b62a0', textTransform: 'uppercase' as const, letterSpacing: '.8px', marginBottom: 7 }}>Gebruikersnaam</label>
          <input
            type="text" value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="gebruikersnaam"
            style={{ width: '100%', padding: '12px 14px', background: '#f0ecff', border: '1.5px solid #e2dcf8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#1a1535', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b62a0', textTransform: 'uppercase' as const, letterSpacing: '.8px', marginBottom: 7 }}>Wachtwoord</label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="••••••••"
            style={{ width: '100%', padding: '12px 14px', background: '#f0ecff', border: '1.5px solid #e2dcf8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#1a1535', outline: 'none' }}
          />
        </div>

        <button
          onClick={doLogin}
          style={{ width: '100%', padding: 13, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: '#fff', cursor: 'pointer', marginTop: 4 }}
        >
          Inloggen →
        </button>

        {error && (
          <div style={{ fontSize: 12, color: '#ff4e6a', marginTop: 10, padding: '8px 12px', background: '#fff0f3', borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1.5px dashed #e2dcf8' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '.8px', color: '#a99fd4', marginBottom: 10, fontWeight: 700 }}>Demo-accounts — klik om in te vullen</div>
          {DEMO.map(d => (
            <div
              key={d.user}
              onClick={() => { setUsername(d.user); setPassword(d.pass) }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0ecff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b62a0' }}>{d.user} / {d.pass}</span>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: d.type === 'admin' ? 'linear-gradient(135deg,#e8f4ff,#ffe8f8)' : '#f0ecff', color: '#6c3fff' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
