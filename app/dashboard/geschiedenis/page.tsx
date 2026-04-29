'use client'
import { useState } from 'react'
import { useData } from '@/app/context/DataContext'

export default function GeschiedenisPage() {
  const { importHistory, allData, deleteImport, clearAll } = useData()
  const [confirm, setConfirm] = useState<{ title: string; msg: string; fn: () => void; danger?: boolean } | null>(null)

  const showConfirm = (title: string, msg: string, fn: () => void, danger = false) => setConfirm({ title, msg, fn, danger })

  // Compute new vs returning per week
  const seen = new Set<string>()
  const weekStats = importHistory.map(imp => {
    let nieuw = 0, terug = 0
    imp.data.forEach(d => {
      const k = (d.t || '') + (d.vn || '') + (d.an || '')
      if (seen.has(k)) terug++; else nieuw++
      seen.add(k)
    })
    return { nieuw, terug, pct: imp.count ? Math.round(terug / imp.count * 100) : 0 }
  })

  const allKeys = new Set(importHistory.flatMap(imp => imp.data.map(d => d.t || d.vn + d.an)))
  const returnKlanten = new Set<string>()
  const seenForReturn: Record<string, number> = {}
  importHistory.forEach(imp => imp.data.forEach(d => {
    const k = d.t || d.vn + d.an
    if (seenForReturn[k] !== undefined) returnKlanten.add(k)
    seenForReturn[k] = (seenForReturn[k] || 0) + 1
  }))

  if (!importHistory.length) return (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Geen imports opgeslagen</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Importeer een CSV om te beginnen. Data wordt opgeslagen in de database.</div>
      <a href="/dashboard/import" style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>CSV importeren →</a>
    </div>
  )

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px' }}>Importgeschiedenis</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Alle wekelijkse imports opgeslagen in de database</div>
        </div>
        <button onClick={() => showConfirm('Alle data wissen?', 'Alle opgeslagen imports worden permanent verwijderd. Dit kan niet ongedaan worden gemaakt.', clearAll, true)}
          style={{ padding: '10px 18px', background: '#fff', border: '1.5px solid var(--red)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--red)' }}>
          🗑 Alle data wissen
        </button>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[['📥 Imports opgeslagen', importHistory.length, 'weken bijgehouden'], ['👥 Unieke klanten', allKeys.size, 'over alle weken'], ['🔄 Terugkerende klanten', returnKlanten.size, 'meer dan 1 week gezien'], ['📅 Laatste import', importHistory[importHistory.length-1]?.label || '—', '']].map(([l,v,s]) => (
          <div key={l as string} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>{l}</div>
            <div style={{ fontSize: typeof v === 'number' ? 28 : 16, fontWeight: 700, letterSpacing: '-.6px', lineHeight: 1 }}>{v}</div>
            {s && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{s}</div>}
          </div>
        ))}
      </div>

      {/* Week table */}
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Nieuw vs. terugkerend per week</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            {['Week','Totaal','🆕 Nieuw','🔄 Terugkerend','% Terugkerend','Actie'].map(h => (
              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', borderBottom: '1.5px solid var(--border)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {importHistory.map((imp, i) => {
              const st = weekStats[i]
              const isLast = i === importHistory.length - 1
              const pctColor = st.pct >= 60 ? 'var(--green)' : st.pct >= 30 ? 'var(--accent)' : 'var(--red)'
              return (
                <tr key={imp.id} style={{ background: isLast ? 'rgba(108,63,255,.02)' : '' }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                    {imp.label} {isLast && <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(108,63,255,.1)', color: 'var(--accent)', borderRadius: 20, marginLeft: 6 }}>Laatste</span>}
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{new Date(imp.date).toLocaleDateString('nl-NL')}</div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{imp.count}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{st.nieuw}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--green)' }}>{st.terug}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
                        <div style={{ height: '100%', width: `${st.pct}%`, background: pctColor, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: pctColor, minWidth: 36 }}>{st.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => showConfirm('Import verwijderen?', 'Deze import wordt permanent verwijderd uit de database.', () => deleteImport(imp.id))}
                      style={{ padding: '4px 10px', fontSize: 11, border: '1.5px solid var(--border)', borderRadius: 6, background: '#fff', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => { (e.currentTarget.style.borderColor='var(--red)'); (e.currentTarget.style.color='var(--red)') }}
                      onMouseLeave={e => { (e.currentTarget.style.borderColor='var(--border)'); (e.currentTarget.style.color='var(--text3)') }}>
                      Verwijderen
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Top klanten */}
      {allData.filter(d => d.visitCount > 1).length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>🏆 Trouwste klanten (meeste weken gezien)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['#','Klant','Vestiging','Weken gezien','Aanwezigheid','Segment'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', borderBottom: '1.5px solid var(--border)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...allData].filter(d => d.visitCount > 1).sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 20).map((d, i) => {
                const dots = importHistory.map(imp => imp.data.some(r => r.t === (d.telefoon || '').replace(/\D/g,'').slice(-9)) ? '●' : '○').join(' ')
                return (
                  <tr key={i} onMouseEnter={e => (e.currentTarget.style.background='var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontWeight: 700 }}>{i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}><div style={{ fontWeight: 700 }}>{d.naam}</div><div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{d.telefoon || '—'}</div></td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{d.vestiging || '—'}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{d.visitCount || 1}</span><span style={{ fontSize: 11, color: 'var(--text3)' }}> / {importHistory.length}</span></td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 13, letterSpacing: 3, color: 'var(--accent)' }}>{dots}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,textTransform:'uppercase', background:d.seg==='weekly'?'var(--green-bg)':d.seg==='monthly'?'rgba(108,63,255,.1)':d.seg==='sporadic'?'var(--amber-bg)':'var(--red-bg)', color:d.seg==='weekly'?'var(--green)':d.seg==='monthly'?'var(--accent)':d.seg==='sporadic'?'var(--amber)':'var(--red)' }}>{d.seg==='weekly'?'Wekelijks':d.seg==='monthly'?'Maandelijks':d.seg==='sporadic'?'Incidenteel':'Eenmalig'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,53,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="animate-slideUp" style={{ background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(26,21,53,.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{confirm.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{confirm.msg}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '9px 18px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: 'var(--text2)' }}>Annuleren</button>
              <button onClick={() => { confirm.fn(); setConfirm(null) }} style={{ padding: '9px 18px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: confirm.danger ? 'var(--red)' : 'var(--accent)', color: '#fff' }}>{confirm.danger ? 'Ja, wissen' : 'Verwijderen'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
