'use client'
import { useState, useMemo } from 'react'
import { useData } from '@/app/context/DataContext'
import { fmt, fmtShort, segLabel } from '@/lib/data'
import type { Klant } from '@/lib/supabase'

type VestStats = { tot: number; ret: number; wk: number; mn: number; sp: number; nw: number; orders: number; omzet: number; freqSum: number; freqCnt: number; klanten: Klant[]; avgInterval: number | null; avgLTV: number }

function buildVestData(allData: Klant[]): Record<string, VestStats> {
  const vm: Record<string, VestStats> = {}
  allData.forEach(d => {
    if (!d.vestiging) return
    if (!vm[d.vestiging]) vm[d.vestiging] = { tot: 0, ret: 0, wk: 0, mn: 0, sp: 0, nw: 0, orders: 0, omzet: 0, freqSum: 0, freqCnt: 0, klanten: [], avgInterval: null, avgLTV: 0 }
    const s = vm[d.vestiging]
    s.tot++; if (d.orders > 1) s.ret++
    if (d.seg === 'weekly') s.wk++
    if (d.seg === 'monthly') s.mn++
    if (d.seg === 'sporadic') s.sp++
    if (d.seg === 'new') s.nw++
    s.orders += d.orders; s.omzet += (d.omzet || 0)
    if (d.freq && d.freq > 0) { s.freqSum += d.freq; s.freqCnt++ }
    s.klanten.push(d)
  })
  Object.values(vm).forEach(s => {
    s.avgInterval = s.freqCnt ? Math.round(s.freqSum / s.freqCnt) : null
    s.avgLTV = s.tot && s.omzet > 0 ? +(s.omzet / s.tot).toFixed(2) : 0
  })
  return vm
}

function buildPeriodData(klanten: Klant[], mode: string, from: Date | null, to: Date | null) {
  const buckets: Record<string, { tot: number; ret: number }> = {}
  klanten.forEach(d => {
    if (!d.last) return
    if (from && d.last < from) return
    if (to && d.last > to) return
    let key: string
    if (mode === 'day') key = d.last.toISOString().slice(0, 10)
    else if (mode === '3day') { const b = Math.floor(Math.floor(d.last.getTime() / 864e5) / 3) * 3; key = new Date(b * 864e5).toISOString().slice(0, 10) }
    else if (mode === 'week') { const m = new Date(d.last); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); key = m.toISOString().slice(0, 10) }
    else if (mode === 'month') key = d.last.getFullYear() + '-' + String(d.last.getMonth() + 1).padStart(2, '0')
    else { const q = Math.floor(d.last.getMonth() / 3) + 1; key = d.last.getFullYear() + ' K' + q }
    if (!buckets[key]) buckets[key] = { tot: 0, ret: 0 }
    buckets[key].tot++; if (d.orders > 1) buckets[key].ret++
  })
  const sorted = Object.entries(buckets).sort((a, b) => a[0] < b[0] ? -1 : 1)
  const labels = sorted.map(([k]) => {
    if (mode === 'day' || mode === '3day' || mode === 'week') return fmtShort(new Date(k))
    if (mode === 'month') { const [y, m] = k.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }) }
    return k
  })
  return { labels, tot: sorted.map(([, v]) => v.tot), ret: sorted.map(([, v]) => v.ret) }
}

export default function VestigingenPage() {
  const { allData } = useData()
  const [sortMode, setSortMode] = useState<'pct' | 'tot' | 'wk'>('pct')
  const [selected, setSelected] = useState<string | null>(null)
  const [period, setPeriod] = useState('month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const vm = useMemo(() => buildVestData(allData), [allData])
  const sorted = useMemo(() => {
    const entries = Object.entries(vm)
    if (sortMode === 'pct') return entries.sort((a, b) => (b[1].tot ? b[1].ret / b[1].tot : 0) - (a[1].tot ? a[1].ret / a[1].tot : 0))
    if (sortMode === 'tot') return entries.sort((a, b) => b[1].tot - a[1].tot)
    return entries.sort((a, b) => b[1].wk - a[1].wk)
  }, [vm, sortMode])

  const selectedData = selected ? vm[selected] : null
  const periodData = useMemo(() => {
    if (!selectedData) return null
    return buildPeriodData(selectedData.klanten, period, fromDate ? new Date(fromDate) : null, toDate ? new Date(toDate + 'T23:59:59') : null)
  }, [selectedData, period, fromDate, toDate])

  if (!allData.length) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text3)' }}><div style={{ fontSize: 48, marginBottom: 12 }}>📂</div><div style={{ fontSize: 15, fontWeight: 600 }}>Nog geen data</div></div>

  const maxPct = Math.max(...sorted.map(([, s]) => s.tot ? Math.round(s.ret / s.tot * 100) : 0), 1)
  const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 10 }}>
        <div><div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px' }}>Vestigingen</div><div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Klik op een vestiging voor gedetailleerde analyse</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['pct','% Terugkerend'],['tot','Meeste klanten'],['wk','Meest wekelijks']].map(([m, l]) => (
            <button key={m} onClick={() => setSortMode(m as any)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--border)', background: sortMode === m ? 'linear-gradient(135deg,#6c3fff,#ff4fc8)' : '#fff', color: sortMode === m ? '#fff' : 'var(--text2)', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {sorted.map(([v, s], i) => {
              const p = s.tot ? Math.round(s.ret / s.tot * 100) : 0
              const grad = p >= 60 ? 'linear-gradient(90deg,#00c98d,#00bcd4)' : p >= 35 ? 'linear-gradient(90deg,#6c3fff,#ff4fc8)' : 'linear-gradient(90deg,#ff4e6a,#ff4fc8)'
              return (
                <tr key={v} onClick={() => setSelected(v)} style={{ cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px', width: 40, fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: i < 3 ? '#f5a623' : 'var(--text3)' }}>{emojis[i] || `#${i+1}`}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.tot} klanten · {s.wk} wekelijks{s.avgInterval ? ` · gem. ${s.avgInterval}d` : ''}{s.avgLTV > 0 ? ` · LTV €${s.avgLTV}` : ''}</div>
                  </td>
                  <td style={{ padding: '12px 16px', width: 200 }}>
                    <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(p / maxPct * 100)}%`, background: grad, borderRadius: 4, transition: 'width .5s' }} />
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', width: 60, fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, background: `${grad}`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{p}%</td>
                  <td style={{ padding: '12px 16px', width: 24, color: 'var(--text3)', fontSize: 18 }}>›</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Drilldown modal */}
      {selected && selectedData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,21,53,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="animate-slideUp" style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 860, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(26,21,53,.25)' }}>
            <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '24px 24px 0 0' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.4px' }}>{selected}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{selectedData.tot} klanten · {selectedData.tot ? Math.round(selectedData.ret / selectedData.tot * 100) : 0}% terugkerend</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text2)' }}>✕</button>
            </div>
            <div style={{ padding: '1.75rem 2rem' }}>
              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedData.avgLTV > 0 ? 5 : 4}, 1fr)`, gap: 12, marginBottom: '1.5rem' }}>
                {[['Klanten', selectedData.tot, ''], ['Terugkerend', `${selectedData.tot ? Math.round(selectedData.ret/selectedData.tot*100) : 0}%`, ''], ['Wekelijks', selectedData.wk, ''], ['Gem. interval', selectedData.avgInterval ? selectedData.avgInterval+'d' : '—', ''], ...(selectedData.avgLTV > 0 ? [['Gem. LTV', `€${selectedData.avgLTV}`, '']] : [])].map(([l, v]) => (
                  <div key={l as string} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Period chart */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 12 }}>📅 Terugkerende klanten per periode</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Van</div>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '7px 10px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', outline: 'none', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>Tot</div>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '7px 10px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', outline: 'none', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[['day','Per dag'],['3day','Per 3 dgn'],['week','Per week'],['month','Per maand'],['quarter','Per kwartaal']].map(([m,l]) => (
                      <button key={m} onClick={() => setPeriod(m)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--border)', background: period === m ? 'linear-gradient(135deg,#6c3fff,#ff4fc8)' : '#fff', color: period === m ? '#fff' : 'var(--text2)', fontFamily: 'inherit' }}>{l}</button>
                    ))}
                  </div>
                </div>
                {periodData && periodData.labels.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 160, paddingBottom: 24, position: 'relative' }}>
                      {periodData.labels.map((label, i) => {
                        const maxVal = Math.max(...periodData.tot)
                        const totH = maxVal ? Math.round((periodData.tot[i] / maxVal) * 120) : 0
                        const retH = maxVal ? Math.round((periodData.ret[i] / maxVal) * 120) : 0
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, minWidth: 32 }}>
                            <div style={{ width: '100%', position: 'relative', height: totH, borderRadius: '4px 4px 0 0', background: 'var(--surface2)', overflow: 'hidden' }}>
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: retH, background: 'linear-gradient(180deg,#6c3fff,#ff4fc8)', borderRadius: '4px 4px 0 0' }} />
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'top center', marginTop: 4 }}>{label}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)' }} />Terugkerend</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface2)', border: '1.5px solid var(--border)' }} />Nieuw / eenmalig</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Klanten list */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>👥 Klanten — gesorteerd op meeste bestellingen</div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {[...selectedData.klanten].sort((a, b) => b.orders - a.orders).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.naam}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{d.telefoon || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{d.orders}x</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{segLabel(d.seg)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
