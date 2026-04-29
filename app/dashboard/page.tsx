'use client'
import { useState, useMemo } from 'react'
import { useData } from '@/app/context/DataContext'
import { useAuth } from '@/app/context/AuthContext'
import { fmt, segLabel } from '@/lib/data'
import type { Klant } from '@/lib/supabase'

function MetricCard({ label, value, sub, trend, color }: any) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem', position: 'relative', overflow: 'hidden', transition: 'transform .2s, box-shadow .2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(108,63,255,.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.6px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
      {trend && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, marginTop: 8, background: trend.up ? 'var(--green-bg)' : 'var(--red-bg)', color: trend.up ? 'var(--green)' : 'var(--red)' }}>{trend.label}</div>}
    </div>
  )
}

function BarRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 110, flexShrink: 0, textAlign: 'right', fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 24, background: 'var(--surface2)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, fontWeight: 700, color: '#fff', transition: 'width .6s' }}>
          {pct > 10 ? `${pct}%` : ''}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 38, textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{pct}%</span>
    </div>
  )
}

function segTag(s: Klant['seg']) {
  const map = { weekly: { bg: 'var(--green-bg)', color: 'var(--green)', dot: 'var(--green)' }, monthly: { bg: 'rgba(108,63,255,.1)', color: 'var(--accent)', dot: 'var(--accent)' }, sporadic: { bg: 'var(--amber-bg)', color: 'var(--amber)', dot: 'var(--amber)' }, new: { bg: 'var(--red-bg)', color: 'var(--red)', dot: 'var(--red)' } }
  const c = map[s]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: c.bg, color: c.color }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />{segLabel(s)}
  </span>
}

export default function OverviewPage() {
  const { allData, importHistory } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [vestFilter, setVestFilter] = useState('')
  const [segFilter, setSegFilter] = useState('')
  const [kanaalFilter, setKanaalFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const view = useMemo(() => user?.role === 'admin' ? allData : allData.filter(d => d.vestiging === user?.vestiging), [allData, user])

  const filtered = useMemo(() => {
    let d = view
    if (search) d = d.filter(k => k.naam.toLowerCase().includes(search.toLowerCase()) || k.telefoon.includes(search))
    if (vestFilter) d = d.filter(k => k.vestiging === vestFilter)
    if (segFilter) d = d.filter(k => k.seg === segFilter)
    if (kanaalFilter === 'multi') d = d.filter(k => k.isMultiChannel)
    else if (kanaalFilter) d = d.filter(k => k.kanaal === kanaalFilter)
    if (fromDate) d = d.filter(k => k.last && k.last >= new Date(fromDate))
    if (toDate) d = d.filter(k => k.last && k.last <= new Date(toDate + 'T23:59:59'))
    return d
  }, [view, search, vestFilter, segFilter, kanaalFilter, fromDate, toDate])

  const vests = useMemo(() => [...new Set(allData.map(d => d.vestiging).filter(Boolean))].sort(), [allData])
  const dates = useMemo(() => allData.map(d => d.last).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime()), [allData])

  const tot = filtered.length
  const ret = filtered.filter(d => d.orders > 1).length
  const pct = tot ? Math.round(ret / tot * 100) : 0
  const wk = filtered.filter(d => d.seg === 'weekly').length
  const nieuw = importHistory.length > 1 ? filtered.filter(d => (d.visitCount || 1) === 1).length : 0
  const withFreq = filtered.filter(d => d.freq && d.freq > 0)
  const avgInterval = withFreq.length ? Math.round(withFreq.reduce((s, d) => s + d.freq!, 0) / withFreq.length) : null
  const hasOmzet = filtered.some(d => d.omzet > 0)
  const avgLTV = hasOmzet && tot ? +(filtered.reduce((s, d) => s + (d.omzet || 0), 0) / tot).toFixed(2) : 0

  const setPreset = (days: number) => {
    if (!dates.length) return
    const maxD = dates[dates.length - 1]!
    const minD = dates[0]!
    setToDate(maxD.toISOString().slice(0, 10))
    if (days === 0) setFromDate(minD.toISOString().slice(0, 10))
    else { const f = new Date(maxD); f.setDate(f.getDate() - days); setFromDate(f.toISOString().slice(0, 10)) }
  }

  if (!allData.length) return (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📂</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Nog geen data geladen</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Importeer een CSV-bestand om te beginnen</div>
      <a href="/dashboard/import" style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>CSV importeren →</a>
    </div>
  )

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px' }}>Overzicht {user?.role === 'fn' && <span style={{ color: 'var(--text2)', fontWeight: 500 }}>— {user.vestiging}</span>}</div>
        <button onClick={() => { const csv = [['Voornaam','Achternaam','Vestiging','Kanaal','Bestellingen','LTV','Eerste','Laatste','Segment']].concat(filtered.map(d => [d.voornaam,d.achternaam,d.vestiging,d.kanaal,d.orders,d.omzet,fmt(d.first),fmt(d.last),segLabel(d.seg)] as any)).map(r => r.map((x: any) => `"${x||''}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv); a.download='ltv-export.csv'; a.click() }}
          style={{ padding: '10px 18px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>
          ↓ Exporteren
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasOmzet ? 6 : 5}, 1fr)`, gap: 14, marginBottom: '2rem' }}>
        <MetricCard label="Totaal klanten" value={tot} sub="unieke klanten" color="linear-gradient(90deg,#6c3fff,#ff4fc8)" />
        <MetricCard label="Terugkerend" value={`${pct}%`} trend={{ up: pct >= 50, label: `${pct >= 50 ? '↑' : '↓'} ${ret} klanten` }} color="linear-gradient(90deg,#00c98d,#00bcd4)" />
        <MetricCard label="Nieuwe klanten" value={nieuw} sub={importHistory.length > 1 ? 't.o.v. vorige week' : '—'} color="linear-gradient(90deg,#ff4fc8,#ff9f2e)" />
        <MetricCard label="Wekelijks" value={wk} sub={`${tot ? Math.round(wk/tot*100) : 0}% van totaal`} color="linear-gradient(90deg,#ff9f2e,#ffd700)" />
        <MetricCard label="Gem. interval" value={avgInterval ? `${avgInterval}d` : '—'} sub="tussen bezoeken" color="linear-gradient(90deg,#9b7cff,#6c3fff)" />
        {hasOmzet && <MetricCard label="Gem. LTV" value={`€${avgLTV}`} sub="per klant" color="linear-gradient(90deg,#00c98d,#6c3fff)" />}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek klant..." style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', background: '#fff' }} />
          </div>
          {user?.role === 'admin' && (
            <select value={vestFilter} onChange={e => setVestFilter(e.target.value)} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
              <option value="">Alle vestigingen</option>
              {vests.map(v => <option key={v}>{v}</option>)}
            </select>
          )}
          <select value={segFilter} onChange={e => setSegFilter(e.target.value)} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
            <option value="">Alle segmenten</option>
            <option value="weekly">🟢 Wekelijks</option>
            <option value="monthly">🔵 Maandelijks</option>
            <option value="sporadic">🟡 Incidenteel</option>
            <option value="new">🔴 Eenmalig</option>
          </select>
          <select value={kanaalFilter} onChange={e => setKanaalFilter(e.target.value)} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
            <option value="">Alle kanalen</option>
            <option value="website">🌐 Eigen website</option>
            <option value="platform">📦 Thuisbezorgd</option>
            <option value="multi">🔀 Beide kanalen</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto', fontWeight: 500 }}>{tot} klanten</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>📅 Periode</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '7px 10px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>t/m</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '7px 10px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }} />
          {[7, 30, 90, 180, 365].map(d => (
            <button key={d} onClick={() => setPreset(d)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text2)', fontFamily: 'inherit' }}>{d === 365 ? '1 jaar' : d < 30 ? `${d} dgn` : d === 30 ? '30 dgn' : d === 90 ? '90 dgn' : '6 mnd'}</button>
          ))}
          <button onClick={() => setPreset(0)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text2)', fontFamily: 'inherit' }}>Alles</button>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '1.1rem' }}>Terugkeerfrequentie</div>
          {[['weekly','Wekelijks','linear-gradient(90deg,#00c98d,#00bcd4)'],['monthly','Maandelijks','linear-gradient(90deg,#6c3fff,#ff4fc8)'],['sporadic','Incidenteel','linear-gradient(90deg,#ff9f2e,#ffd700)'],['new','Eenmalig','linear-gradient(90deg,#ff4e6a,#ff4fc8)']].map(([s,l,c]) => {
            const n = filtered.filter(d => d.seg === s).length
            const p = tot ? Math.round(n / tot * 100) : 0
            return <BarRow key={s} label={l as string} pct={p} color={c as string} />
          })}
        </div>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '1.1rem' }}>🌐 Kanaalvergelijking</div>
          {(() => {
            const web = filtered.filter(d => d.kanaal === 'website')
            const plat = filtered.filter(d => d.kanaal === 'platform')
            const multi = filtered.filter(d => d.isMultiChannel)
            const stats = (arr: Klant[]) => ({ tot: arr.length, retPct: arr.length ? Math.round(arr.filter(d=>d.orders>1).length/arr.length*100) : 0, wkPct: arr.length ? Math.round(arr.filter(d=>d.seg==='weekly').length/arr.length*100) : 0, ltv: arr.some(d=>d.omzet>0) ? +(arr.reduce((s,d)=>s+(d.omzet||0),0)/Math.max(arr.length,1)).toFixed(2) : 0 })
            const ws = stats(web); const ps = stats(plat)
            return <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1.5px solid var(--border)' }}>Statistiek</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--green)', borderBottom: '1.5px solid var(--border)', background: 'rgba(0,201,141,.04)' }}>🌐 Website<br/><span style={{fontSize:10,fontWeight:400,color:'var(--text3)'}}>{ws.tot} klanten</span></th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--amber)', borderBottom: '1.5px solid var(--border)', background: 'rgba(255,159,46,.04)' }}>📦 Platform<br/><span style={{fontSize:10,fontWeight:400,color:'var(--text3)'}}>{ps.tot} klanten</span></th>
                </tr></thead>
                <tbody>
                  {[['% Terugkerend', `${ws.retPct}%`, `${ps.retPct}%`], ['% Wekelijks', `${ws.wkPct}%`, `${ps.wkPct}%`], ...(hasOmzet ? [['Gem. LTV', `€${ws.ltv}`, `€${ps.ltv}`]] : [])].map(([l, w, p]) => (
                    <tr key={l}><td style={{ padding: '8px', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{l}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: parseFloat(w)>=parseFloat(p)?'var(--green)':'var(--text)' }}>{w}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: parseFloat(p)>parseFloat(w)?'var(--green)':'var(--text)' }}>{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {multi.length > 0 && <div style={{ marginTop: 12, padding: '8px 12px', background: 'linear-gradient(135deg,rgba(108,63,255,.06),rgba(0,201,141,.06))', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>🔀 {multi.length} klanten bestellen via BEIDE kanalen</div>}
            </>
          })()}
        </div>
      </div>

      {/* Recent klanten */}
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Recente klanten</div>
          <a href="/dashboard/klanten" style={{ padding: '5px 14px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', color: 'var(--text2)' }}>Alle klanten →</a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Naam','Vestiging','Kanaal','Bestellingen','Laatste bestelling','Segment'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--text3)', borderBottom: '1.5px solid var(--border)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.slice(0, 8).map((d, i) => (
                <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{d.naam}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text2)' }}>{d.vestiging || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                    {d.isMultiChannel ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(108,63,255,.1)', color: 'var(--accent)' }}>🔀 Beide</span>
                    : d.kanaal === 'website' ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)' }}>🌐 Website</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--amber-bg)', color: 'var(--amber)' }}>📦 Platform</span>}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace' }}>{d.orders}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(d.last)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{segTag(d.seg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
