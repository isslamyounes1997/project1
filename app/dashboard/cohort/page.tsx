'use client'
import { useState, useMemo } from 'react'
import { useData } from '@/app/context/DataContext'

export default function CohortPage() {
  const { importHistory, allData } = useData()
  const [mode, setMode] = useState<'retention' | 'count'>('retention')

  const cohorts = useMemo(() => {
    if (importHistory.length < 2) return []
    return importHistory.map((cohortImp, ci) => {
      const cohortKeys = new Set(cohortImp.data.map(d => d.t || d.vn + d.an))
      const cohortSize = cohortKeys.size
      const retention = importHistory.map((w, wi) => {
        if (wi < ci) return null
        if (wi === ci) return cohortSize
        const appeared = w.data.filter(d => cohortKeys.has(d.t || d.vn + d.an)).length
        return appeared
      })
      return { label: cohortImp.label, size: cohortSize, retention }
    })
  }, [importHistory])

  if (!importHistory.length || importHistory.length < 2) return (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Minimaal 2 imports nodig</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Importeer meerdere weken om cohorten te vergelijken. Je hebt nu {importHistory.length} import(en).</div>
      <a href="/dashboard/import" style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>CSV importeren →</a>
    </div>
  )

  const nWeeks = importHistory.length

  // Best/worst cohort
  const cohortRetentions = cohorts.slice(0, -1).map((c, ci) => {
    const w1 = c.retention[ci + 1]
    return { label: c.label, size: c.size, pct: w1 !== null && c.size ? Math.round(w1 / c.size * 100) : 0 }
  })
  const best = [...cohortRetentions].sort((a, b) => b.pct - a.pct)[0]
  const worst = [...cohortRetentions].sort((a, b) => a.pct - b.pct)[0]

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px' }}>Cohortanalyse</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Hoeveel klanten per instroom-week keren terug na 1, 2, 3... weken?</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['retention','Retentie %'],['count','Aantal klanten']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m as any)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--border)', background: mode === m ? 'linear-gradient(135deg,#6c3fff,#ff4fc8)' : '#fff', color: mode === m ? '#fff' : 'var(--text2)', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '1rem' }}>📊 Retentie per cohort-week</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text3)', borderBottom: '1.5px solid var(--border)', minWidth: 160, whiteSpace: 'nowrap' }}>Cohort (instroom week)</th>
              {importHistory.map((_, i) => (
                <th key={i} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text3)', borderBottom: '1.5px solid var(--border)', minWidth: 70, whiteSpace: 'nowrap' }}>Week +{i}</th>
              ))}
            </tr></thead>
            <tbody>
              {cohorts.map((c, ci) => (
                <tr key={ci}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.size} klanten</div>
                  </td>
                  {c.retention.map((v, wi) => {
                    if (v === null) return <td key={wi} style={{ padding: '8px 10px', textAlign: 'center', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }} />
                    const pct = c.size ? Math.round(v / c.size * 100) : 0
                    const opacity = wi === ci ? 1 : Math.max(0.1, pct / 100)
                    const bg = wi === ci ? 'rgba(108,63,255,0.15)' : `rgba(108,63,255,${(opacity * 0.7).toFixed(2)})`
                    const textColor = pct > 50 ? '#fff' : 'var(--text)'
                    return (
                      <td key={wi} style={{ padding: '8px 10px', textAlign: 'center', background: bg, color: textColor, fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: wi === ci ? 700 : 500, borderBottom: '1px solid var(--border)' }}>
                        {mode === 'retention' ? `${pct}%` : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Average row */}
              <tr style={{ background: 'var(--surface2)' }}>
                <td style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>Gemiddeld</td>
                {importHistory.map((_, wi) => {
                  const relevant = cohorts.filter((_, ci) => ci <= wi)
                  if (!relevant.length) return <td key={wi} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }} />
                  const avgPct = Math.round(relevant.reduce((sum, c) => {
                    const v = c.retention[wi]
                    return v !== null ? sum + (c.size ? v / c.size * 100 : 0) : sum
                  }, 0) / relevant.length)
                  return <td key={wi} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{mode === 'retention' ? `${avgPct}%` : '—'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          💡 <strong>Hoe lezen:</strong> Week +0 = 100% (de nieuwe klanten van die week). Week +1 toont hoeveel % de week erna terugkwam. Donkerder paars = hogere retentie.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {best && <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '1rem' }}>🏆 Beste cohort-week</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{best.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{best.pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>terugkeer na week 1 · {best.size} instroom klanten</div>
        </div>}
        {worst && <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '1rem' }}>📉 Slechtste cohort-week</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{worst.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--red)' }}>{worst.pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>terugkeer na week 1 · {worst.size} instroom klanten</div>
        </div>}
      </div>
    </div>
  )
}
