'use client'
import { useState, useMemo } from 'react'
import { useData } from '@/app/context/DataContext'
import { useAuth } from '@/app/context/AuthContext'
import { fmt, segLabel } from '@/lib/data'
import type { Klant } from '@/lib/supabase'

type SortCol = 'voornaam' | 'achternaam' | 'vestiging' | 'kanaal' | 'visitCount' | 'orders' | 'omzet' | 'first' | 'last' | 'freq' | 'seg'

function segTag(s: Klant['seg']) {
  const map = { weekly: { bg: 'var(--green-bg)', color: 'var(--green)', dot: 'var(--green)' }, monthly: { bg: 'rgba(108,63,255,.1)', color: 'var(--accent)', dot: 'var(--accent)' }, sporadic: { bg: 'var(--amber-bg)', color: 'var(--amber)', dot: 'var(--amber)' }, new: { bg: 'var(--red-bg)', color: 'var(--red)', dot: 'var(--red)' } }
  const c = map[s]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, background: c.bg, color: c.color }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />{segLabel(s)}
  </span>
}

function kanaalBadge(d: Klant) {
  if (d.isMultiChannel) return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(108,63,255,.1)', color: 'var(--accent)' }}>🔀 Beide</span>
  if (d.kanaal === 'website') return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)' }}>🌐 Website</span>
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--amber-bg)', color: 'var(--amber)' }}>📦 Platform</span>
}

const PAGE_SIZE = 15

export default function KlantenPage() {
  const { allData } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [vestFilter, setVestFilter] = useState('')
  const [segFilter, setSegFilter] = useState('')
  const [kanaalFilter, setKanaalFilter] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('last')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [page, setPage] = useState(1)

  const view = useMemo(() => user?.role === 'admin' ? allData : allData.filter(d => d.vestiging === user?.vestiging), [allData, user])
  const vests = useMemo(() => [...new Set(allData.map(d => d.vestiging).filter(Boolean))].sort(), [allData])
  const hasOmzet = allData.some(d => d.omzet > 0)

  const filtered = useMemo(() => {
    let d = view
    if (search) d = d.filter(k => k.naam.toLowerCase().includes(search.toLowerCase()) || k.telefoon.includes(search) || k.email.toLowerCase().includes(search.toLowerCase()) || k.achternaam.toLowerCase().includes(search.toLowerCase()))
    if (vestFilter) d = d.filter(k => k.vestiging === vestFilter)
    if (segFilter) d = d.filter(k => k.seg === segFilter)
    if (kanaalFilter === 'multi') d = d.filter(k => k.isMultiChannel)
    else if (kanaalFilter) d = d.filter(k => k.kanaal === kanaalFilter)
    return [...d].sort((a, b) => {
      let va: any = a[sortCol as keyof Klant]
      let vb: any = b[sortCol as keyof Klant]
      if (['voornaam', 'achternaam', 'vestiging', 'seg', 'kanaal'].includes(sortCol)) { va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase() }
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      return va < vb ? -sortDir : va > vb ? sortDir : 0
    })
  }, [view, search, vestFilter, segFilter, kanaalFilter, sortCol, sortDir])

  const tot = filtered.length
  const pages = Math.max(1, Math.ceil(tot / PAGE_SIZE))
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const sort = (col: SortCol) => { if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1); else { setSortCol(col); setSortDir(col === 'last' ? -1 : 1) }; setPage(1) }
  const thStyle = (col: SortCol): React.CSSProperties => ({ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: sortCol === col ? 'var(--accent)' : 'var(--text3)', borderBottom: '1.5px solid var(--border)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' })

  const exportData = () => {
    const rows = [['Voornaam','Achternaam','Vestiging','Kanaal','Bezoeken','Bestellingen','Totaal besteed','Eerste','Laatste','Interval','Segment']].concat(filtered.map(d => [d.voornaam,d.achternaam,d.vestiging,d.kanaal,d.visitCount,d.orders,d.omzet||'',fmt(d.first),fmt(d.last),d.freq||'',segLabel(d.seg)] as any))
    const csv = rows.map(r => r.map((x: any) => `"${x||''}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv); a.download = 'ltv-klanten.csv'; a.click()
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px' }}>Klanten <span style={{ color: 'var(--text2)', fontWeight: 500 }}>({tot})</span></div>
        <button onClick={exportData} style={{ padding: '10px 18px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>↓ Exporteren</button>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)' }}>🔍</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Zoek naam, telefoon of e-mail..." style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', background: '#fff' }} />
          </div>
          {user?.role === 'admin' && (
            <select value={vestFilter} onChange={e => { setVestFilter(e.target.value); setPage(1) }} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
              <option value="">Alle vestigingen</option>{vests.map(v => <option key={v}>{v}</option>)}
            </select>
          )}
          <select value={segFilter} onChange={e => { setSegFilter(e.target.value); setPage(1) }} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
            <option value="">Alle segmenten</option><option value="weekly">🟢 Wekelijks</option><option value="monthly">🔵 Maandelijks</option><option value="sporadic">🟡 Incidenteel</option><option value="new">🔴 Eenmalig</option>
          </select>
          <select value={kanaalFilter} onChange={e => { setKanaalFilter(e.target.value); setPage(1) }} style={{ padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
            <option value="">Alle kanalen</option><option value="website">🌐 Website</option><option value="platform">📦 Platform</option><option value="multi">🔀 Beide</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto', fontWeight: 500 }}>{tot} klanten</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={thStyle('voornaam')} onClick={() => sort('voornaam')}>Voornaam {sortCol==='voornaam'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('achternaam')} onClick={() => sort('achternaam')}>Achternaam {sortCol==='achternaam'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('vestiging')} onClick={() => sort('vestiging')}>Vestiging {sortCol==='vestiging'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('kanaal')} onClick={() => sort('kanaal')}>Kanaal {sortCol==='kanaal'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('visitCount')} onClick={() => sort('visitCount')}>Bezoeken {sortCol==='visitCount'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('orders')} onClick={() => sort('orders')}>Bestellingen {sortCol==='orders'?sortDir===1?'↑':'↓':'↕'}</th>
              {hasOmzet && <th style={thStyle('omzet')} onClick={() => sort('omzet')}>Totaal besteed {sortCol==='omzet'?sortDir===1?'↑':'↓':'↕'}</th>}
              <th style={thStyle('first')} onClick={() => sort('first')}>Eerste bestelling {sortCol==='first'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('last')} onClick={() => sort('last')}>Laatste bestelling {sortCol==='last'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('freq')} onClick={() => sort('freq')}>Interval {sortCol==='freq'?sortDir===1?'↑':'↓':'↕'}</th>
              <th style={thStyle('seg')} onClick={() => sort('seg')}>Segment {sortCol==='seg'?sortDir===1?'↑':'↓':'↕'}</th>
            </tr></thead>
            <tbody>
              {slice.map((d, i) => {
                const vc = d.visitCount || 1
                const vcColor = vc >= 4 ? 'var(--green)' : vc >= 2 ? 'var(--accent)' : 'var(--text3)'
                return (
                  <tr key={i} onMouseEnter={e => (e.currentTarget.style.background='var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)' }}><div style={{ fontWeight: 600 }}>{d.voornaam || '—'}</div><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{d.telefoon}</div></td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)' }}>{d.achternaam || '—'}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', color: 'var(--text2)', fontSize: 12 }}>{d.vestiging || '—'}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)' }}>{kanaalBadge(d)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)' }}><span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: vcColor }}>{vc}x</span><span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 5 }}>{vc === 1 ? '1e bezoek' : `${vc}e bezoek`}</span></td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', fontFamily: 'DM Mono, monospace' }}>{d.orders}</td>
                    {hasOmzet && <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', fontFamily: 'DM Mono, monospace' }}>{d.omzet > 0 ? `€${d.omzet.toFixed(2)}` : '—'}</td>}
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(d.first)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{fmt(d.last)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{d.freq ? `elke ${d.freq}d` : '—'}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1.5px solid var(--border)' }}>{segTag(d.seg)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1.5px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,tot)} van {tot}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ width: 30, height: 30, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, cursor: page===1?'not-allowed':'pointer', opacity: page===1?.4:1, fontSize: 14 }}>‹</button>
              {Array.from({length:pages},(_,i)=>i+1).filter(p=>p===1||p===pages||Math.abs(p-page)<=1).map((p,i,arr)=>[
                i>0&&arr[i-1]!==p-1&&<span key={`d${p}`} style={{padding:'0 4px',color:'var(--text3)',fontSize:12}}>…</span>,
                <button key={p} onClick={()=>setPage(p)} style={{width:30,height:30,background:p===page?'linear-gradient(135deg,#6c3fff,#ff4fc8)':'#fff',border:`1.5px solid ${p===page?'transparent':'var(--border)'}`,borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:p===page?700:400,color:p===page?'#fff':'var(--text2)',fontFamily:'DM Mono, monospace'}}>{p}</button>
              ])}
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages} style={{ width: 30, height: 30, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, cursor: page===pages?'not-allowed':'pointer', opacity: page===pages?.4:1, fontSize: 14 }}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
