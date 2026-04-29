'use client'
import { useState, useRef, useEffect } from 'react'
import { useData } from '@/app/context/DataContext'
import { useAuth } from '@/app/context/AuthContext'

type Message = { role: 'user' | 'assistant'; content: string }

function buildContext(allData: any[], importHistory: any[]) {
  if (!allData.length) return 'Geen data geladen.'

  const tot = allData.length
  const ret = allData.filter((d: any) => d.orders > 1).length
  const wk = allData.filter((d: any) => d.seg === 'weekly').length
  const mn = allData.filter((d: any) => d.seg === 'monthly').length
  const sp = allData.filter((d: any) => d.seg === 'sporadic').length
  const nw = allData.filter((d: any) => d.seg === 'new').length
  const web = allData.filter((d: any) => d.kanaal === 'website').length
  const plat = allData.filter((d: any) => d.kanaal === 'platform').length
  const multi = allData.filter((d: any) => d.isMultiChannel).length
  const hasOmzet = allData.some((d: any) => d.omzet > 0)
  const totalOmzet = allData.reduce((s: number, d: any) => s + (d.omzet || 0), 0)
  const withFreq = allData.filter((d: any) => d.freq > 0)
  const avgInt = withFreq.length ? Math.round(withFreq.reduce((s: number, d: any) => s + d.freq, 0) / withFreq.length) : null
  const avgLTV = hasOmzet && tot ? totalOmzet / tot : 0

  // Datumrange
  const datesWithFirst = allData.filter((d: any) => d.first).map((d: any) => d.first as Date)
  const minDate = datesWithFirst.length ? new Date(Math.min(...datesWithFirst.map(d => d.getTime()))) : null
  const maxDate = datesWithFirst.length ? new Date(Math.max(...datesWithFirst.map(d => d.getTime()))) : null
  const dateRange = minDate && maxDate
    ? `${minDate.toLocaleDateString('nl-NL')} t/m ${maxDate.toLocaleDateString('nl-NL')}`
    : 'onbekend'
  const today = new Date()

  // ── BLOK 1: Per vestiging ──
  const vm: Record<string, any> = {}
  allData.forEach((d: any) => {
    if (!d.vestiging) return
    if (!vm[d.vestiging]) vm[d.vestiging] = { tot: 0, ret: 0, wk: 0, mn: 0, sp: 0, nw: 0, omzet: 0, freqSum: 0, freqCnt: 0, webCount: 0, platCount: 0 }
    const s = vm[d.vestiging]
    s.tot++; if (d.orders > 1) s.ret++
    if (d.seg === 'weekly') s.wk++
    if (d.seg === 'monthly') s.mn++
    if (d.seg === 'sporadic') s.sp++
    if (d.seg === 'new') s.nw++
    s.omzet += (d.omzet || 0)
    if (d.freq > 0) { s.freqSum += d.freq; s.freqCnt++ }
    if (d.kanaal === 'website') s.webCount++; else s.platCount++
  })
  const vestLines = Object.entries(vm)
    .sort((a: any, b: any) => b[1].tot - a[1].tot)
    .map(([v, s]: any) => {
      const retPct = s.tot ? Math.round(s.ret / s.tot * 100) : 0
      const wkPct = s.tot ? Math.round(s.wk / s.tot * 100) : 0
      const interval = s.freqCnt ? Math.round(s.freqSum / s.freqCnt) : null
      const ltvStr = hasOmzet && s.tot ? ` | LTV: €${(s.omzet / s.tot).toFixed(2)}` : ''
      const webPct = s.tot ? Math.round(s.webCount / s.tot * 100) : 0
      return `- ${v}: ${s.tot} klanten | ${retPct}% terugkerend | ${wkPct}% wekelijks | interval: ${interval ? interval + 'd' : '?'} | website: ${webPct}%${ltvStr}`
    }).join('\n')

  // ── BLOK 2: Maandelijkse breakdown ──
  const monthMap: Record<string, { nieuw: number; terug: number; omzet: number }> = {}
  allData.forEach((d: any) => {
    if (!d.first) return
    const key = `${d.first.getFullYear()}-${String(d.first.getMonth() + 1).padStart(2, '0')}`
    if (!monthMap[key]) monthMap[key] = { nieuw: 0, terug: 0, omzet: 0 }
    monthMap[key].nieuw++
    if (d.orders > 1) monthMap[key].terug++
    monthMap[key].omzet += (d.omzet || 0)
  })
  const monthLines = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => {
      const [y, m] = k.split('-')
      const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
      const retPct = v.nieuw ? Math.round(v.terug / v.nieuw * 100) : 0
      const omzetStr = hasOmzet ? ` | omzet: €${v.omzet.toFixed(0)}` : ''
      return `- ${label}: ${v.nieuw} nieuw | ${v.terug} terug (${retPct}%)${omzetStr}`
    }).join('\n')

  // ── BLOK 3: Kwartalen ──
  const kwMap: Record<string, { nieuw: number; terug: number }> = {}
  allData.forEach((d: any) => {
    if (!d.first) return
    const kw = `${d.first.getFullYear()} K${Math.floor(d.first.getMonth() / 3) + 1}`
    if (!kwMap[kw]) kwMap[kw] = { nieuw: 0, terug: 0 }
    kwMap[kw].nieuw++; if (d.orders > 1) kwMap[kw].terug++
  })
  const kwLines = Object.entries(kwMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `- ${k}: ${v.nieuw} nieuw | ${v.terug} terug (${v.nieuw ? Math.round(v.terug / v.nieuw * 100) : 0}%)`)
    .join('\n')

  // ── BLOK 4: Churn analyse ──
  const churn30 = allData.filter((d: any) => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 30).length
  const churn60 = allData.filter((d: any) => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 60).length
  const churn90 = allData.filter((d: any) => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 90).length
  const churn180 = allData.filter((d: any) => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 180).length
  const churn365 = allData.filter((d: any) => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 365).length
  // Churn per vestiging
  const churnVest = Object.entries(vm).map(([v, s]: any) => {
    const vestData = allData.filter((d: any) => d.vestiging === v && d.last)
    const c90 = vestData.filter((d: any) => (today.getTime() - d.last.getTime()) / 864e5 > 90).length
    return `- ${v}: ${c90} klanten >90d niet gezien (${s.tot ? Math.round(c90 / s.tot * 100) : 0}%)`
  }).join('\n')

  // ── BLOK 5: Campagneweken detectie (weken met abnormaal veel nieuwe klanten) ──
  const weekMap: Record<string, number> = {}
  allData.forEach((d: any) => {
    if (!d.first) return
    const monday = new Date(d.first)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    weekMap[key] = (weekMap[key] || 0) + 1
  })
  const weekCounts = Object.values(weekMap)
  const avgWeek = weekCounts.length ? weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length : 0
  const piekweken = Object.entries(weekMap)
    .filter(([, count]) => count > avgWeek * 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([date, count]) => {
      const d = new Date(date)
      const label = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
      const factor = (count / avgWeek).toFixed(1)
      // Retentie van klanten die in die week binnenkwamen
      const weekKlanten = allData.filter((k: any) => {
        if (!k.first) return false
        const monday = new Date(k.first)
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        return monday.toISOString().slice(0, 10) === date
      })
      const weekRet = weekKlanten.filter((k: any) => k.orders > 1).length
      const weekRetPct = weekKlanten.length ? Math.round(weekRet / weekKlanten.length * 100) : 0
      return `- Week van ${label}: ${count} nieuwe klanten (${factor}x normaal) | ${weekRetPct}% terugkerend`
    }).join('\n')

  // ── BLOK 6: Kanaalmigratie ──
  const platNaarWeb = allData.filter((d: any) => d.isMultiChannel && d.kanaal === 'website').length
  const webNaarPlat = allData.filter((d: any) => d.isMultiChannel && d.kanaal === 'platform').length
  const webLTV = hasOmzet && web ? (allData.filter((d: any) => d.kanaal === 'website').reduce((s: number, d: any) => s + (d.omzet || 0), 0) / web).toFixed(2) : null
  const platLTV = hasOmzet && plat ? (allData.filter((d: any) => d.kanaal === 'platform').reduce((s: number, d: any) => s + (d.omzet || 0), 0) / plat).toFixed(2) : null
  const webRetPct = web ? Math.round(allData.filter((d: any) => d.kanaal === 'website' && d.orders > 1).length / web * 100) : 0
  const platRetPct = plat ? Math.round(allData.filter((d: any) => d.kanaal === 'platform' && d.orders > 1).length / plat * 100) : 0
  const webAvgInt = (() => { const wf = allData.filter((d: any) => d.kanaal === 'website' && d.freq > 0); return wf.length ? Math.round(wf.reduce((s: number, d: any) => s + d.freq, 0) / wf.length) : null })()
  const platAvgInt = (() => { const wf = allData.filter((d: any) => d.kanaal === 'platform' && d.freq > 0); return wf.length ? Math.round(wf.reduce((s: number, d: any) => s + d.freq, 0) / wf.length) : null })()

  // ── BLOK 7: Activatiepotentieel ──
  const spActief = allData.filter((d: any) => d.seg === 'sporadic').length
  const spOmzet = hasOmzet ? allData.filter((d: any) => d.seg === 'sporadic').reduce((s: number, d: any) => s + (d.omzet || 0), 0) / Math.max(spActief, 1) : 0
  const maandLTV = hasOmzet ? allData.filter((d: any) => d.seg === 'monthly').reduce((s: number, d: any) => s + (d.omzet || 0), 0) / Math.max(mn, 1) : 0
  const potentieel10pct = hasOmzet ? Math.round(spActief * 0.1 * (maandLTV - spOmzet)) : null

  // ── BLOK 8: Seizoenspatroon ──
  const seizoenMap: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0 }
  allData.forEach((d: any) => { if (d.first) seizoenMap[String(d.first.getMonth() + 1)]++ })
  const maandNamen = ['', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  const seizoenLines = Object.entries(seizoenMap).map(([m, v]) => `${maandNamen[parseInt(m)]}: ${v}`).join(' | ')

  return `KLANTENDATA OVERZICHT:
- Totaal: ${tot} klanten | ${Math.round(ret / tot * 100)}% terugkerend | datumrange: ${dateRange}
- Segmenten: Wekelijks ${wk} (${Math.round(wk / tot * 100)}%) | Maandelijks ${mn} (${Math.round(mn / tot * 100)}%) | Incidenteel ${sp} (${Math.round(sp / tot * 100)}%) | Eenmalig ${nw} (${Math.round(nw / tot * 100)}%)
- Gem. interval: ${avgInt ? avgInt + 'd' : '?'} | Imports: ${importHistory.length}
${hasOmzet ? `- Totale omzet: €${totalOmzet.toFixed(0)} | Gem. LTV: €${avgLTV.toFixed(2)}` : '- Geen omzetdata beschikbaar'}

VESTIGINGEN:
${vestLines}

NIEUWE KLANTEN PER MAAND:
${monthLines || 'Geen datumdata'}

NIEUWE KLANTEN PER KWARTAAL:
${kwLines || 'Geen datumdata'}

SEIZOENSPATROON (nieuwe klanten per maand totaal):
${seizoenLines}

CHURN ANALYSE (klanten niet meer gezien):
- >30 dagen: ${churn30} (${Math.round(churn30 / tot * 100)}%)
- >60 dagen: ${churn60} (${Math.round(churn60 / tot * 100)}%)
- >90 dagen: ${churn90} (${Math.round(churn90 / tot * 100)}%) ← waarschijnlijk verloren
- >180 dagen: ${churn180} (${Math.round(churn180 / tot * 100)}%)
- >365 dagen: ${churn365} (${Math.round(churn365 / tot * 100)}%)
Churn per vestiging (>90d):
${churnVest}

PIEKWEKEN — MOGELIJKE ACTIEWEKEN (2x+ normaal instroom):
Gemiddeld nieuwe klanten per week: ${Math.round(avgWeek)}
${piekweken || '- Geen duidelijke piekweken gevonden'}

KANAALANALYSE:
- Website: ${web} klanten | ${webRetPct}% terugkerend | interval: ${webAvgInt ? webAvgInt + 'd' : '?'}${webLTV ? ` | LTV: €${webLTV}` : ''}
- Platform (Thuisbezorgd): ${plat} klanten | ${platRetPct}% terugkerend | interval: ${platAvgInt ? platAvgInt + 'd' : '?'}${platLTV ? ` | LTV: €${platLTV}` : ''}
- Klanten op beide kanalen: ${multi}
- Platform→Website migranten: ${platNaarWeb}

ACTIVATIEPOTENTIEEL:
- Incidentele klanten: ${spActief} (bestellen zelden, maar kennen je al)
${potentieel10pct ? `- Als 10% van incidenteel naar maandelijks gaat: +€${potentieel10pct.toLocaleString('nl-NL')} extra omzet` : '- Voeg omzetdata toe voor omzetberekeningen'}
- Klanten >90d niet gezien maar eerder wekelijks/maandelijks: ${allData.filter((d: any) => ['weekly', 'monthly'].includes(d.seg) && d.last && (today.getTime() - d.last.getTime()) / 864e5 > 90).length} (heractivatie-targets)

INSTRUCTIES VOOR VRAGEN:
- Bij datumvragen: gebruik de maandelijkse breakdown en tel op
- Bij campagnevragen: gebruik de piekweken sectie
- Bij churnvragen: gebruik de churn sectie
- Bij kanaalvragen: vergelijk website vs platform statistieken
- Geef altijd concrete aantallen + percentages + een marketingadvies`
}

const SUGGESTIONS = [
  'Hoeveel nieuwe klanten tussen jan–mrt 2025, kwamen ze terug?',
  'Welke actieweek leverde de meest loyale klanten op?',
  'Hoeveel klanten dreigen we te verliezen (>90d niet gezien)?',
  'Vergelijk website vs Thuisbezorgd — wie is meer waard?',
  'Welke maand is historisch onze sterkste groeimaand?',
  'Als ik incidentele klanten activeer, hoeveel levert dat op?',
  'Welke vestiging heeft de hoogste churn?',
  'Vergelijk Q1 2025 met Q2 2025',
  'Welke vestiging verdient de meeste marketingaandacht?',
  'Hoeveel klanten zijn overgestapt van Thuisbezorgd naar eigen website?',
]

export default function AiPage() {
  const { allData, importHistory } = useData()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const tot = allData.length
  const ret = allData.filter(d => d.orders > 1).length
  const web = allData.filter(d => d.kanaal === 'website').length
  const vests = [...new Set(allData.map(d => d.vestiging).filter(Boolean))]
  const today = new Date()
  const churn90 = allData.filter(d => d.last && (today.getTime() - d.last.getTime()) / 864e5 > 90).length

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    try {
      const context = buildContext(allData, importHistory)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: `Je bent een ervaren CMO-assistent voor een Domino's franchise netwerk. Je hebt toegang tot uitgebreide klantendata:\n\n${context}\n\nBeantwoord vragen in het Nederlands. Wees concreet: geef altijd exacte aantallen, percentages én een actionable marketingadvies. Bij datumvragen: gebruik de maandelijkse breakdown. Bij campagnevragen: gebruik de piekweken. Vergelijk altijd met het gemiddelde om context te geven. Sluit af met 1 concrete aanbeveling.`,
          messages: newMessages.slice(-10),
        }),
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Geen antwoord ontvangen.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Er ging iets mis. Controleer je internetverbinding.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>✨</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.4px' }}>AI Data Assistent</div>
            <div style={{ fontSize: 12, color: '#6b62a0', marginTop: 2 }}>CMO-niveau inzichten op basis van jouw klantendata</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tot > 0 && <>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#e6fff7', color: '#00c98d' }}>{tot.toLocaleString('nl-NL')} klanten</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fff0f3', color: '#ff4e6a' }}>{churn90.toLocaleString('nl-NL')} churn risico</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(108,63,255,.1)', color: '#6c3fff' }}>{vests.length} vestigingen</span>
          </>}
        </div>
      </div>

      {/* Stats */}
      {tot > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            ['👥', 'Klanten', tot.toLocaleString('nl-NL'), ''],
            ['🔄', 'Terugkerend', `${Math.round(ret / tot * 100)}%`, ''],
            ['⚠️', 'Churn risico', churn90.toLocaleString('nl-NL'), '>90d niet gezien'],
            ['🌐', 'Via website', `${web.toLocaleString('nl-NL')}`, `${tot ? Math.round(web / tot * 100) : 0}% van totaal`],
          ].map(([icon, l, v, sub]) => (
            <div key={l} style={{ background: '#fff', border: '1.5px solid #e2dcf8', borderRadius: 16, padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0ecff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 10, color: '#a99fd4', marginTop: 3 }}>{sub || l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)}
            style={{ padding: '5px 12px', background: '#fff', border: '1.5px solid #cec6f5', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: '#6c3fff', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0ecff')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div style={{ background: '#fff', border: '1.5px solid #e2dcf8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 380, maxHeight: 500, overflowY: 'auto' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✨</div>
              <div style={{ background: '#f0ecff', border: '1.5px solid #e2dcf8', borderRadius: '14px 14px 14px 4px', padding: '12px 16px', fontSize: 13, color: '#1a1535', lineHeight: 1.7, maxWidth: '90%' }}>
                Hoi! Ik ben je CMO-assistent met toegang tot uitgebreide analyse van jouw klantendata. Ik kan vragen beantwoorden over:<br />
                <strong>📅 Datumperiodes</strong> — nieuwe klanten + retentie per periode<br />
                <strong>📣 Campagnes</strong> — welke actieweken leverden loyale klanten op?<br />
                <strong>⚠️ Churn</strong> — wie dreigt verloren te gaan?<br />
                <strong>💶 Omzetpotentieel</strong> — wat levert activatie op?<br />
                <strong>📊 Vestigingsvergelijking</strong> — wie presteert het best/slechtst?
                {!tot && <><br /><br /><strong>Let op:</strong> importeer eerst een CSV.</>}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.role === 'user' ? '#f0ecff' : 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: m.role === 'user' ? 11 : 14, fontWeight: 700, color: m.role === 'user' ? '#6c3fff' : '#fff', flexShrink: 0 }}>
                {m.role === 'user' ? (user?.initials || 'AD') : '✨'}
              </div>
              <div style={{ background: m.role === 'user' ? 'linear-gradient(135deg,rgba(108,63,255,.12),rgba(255,79,200,.08))' : '#f0ecff', border: `1.5px solid ${m.role === 'user' ? 'rgba(108,63,255,.2)' : '#e2dcf8'}`, borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, color: '#1a1535', lineHeight: 1.7, maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✨</div>
              <div style={{ background: '#f0ecff', border: '1.5px solid #e2dcf8', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 200, 400].map(delay => (
                  <div key={delay} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a99fd4', animation: `dotPulse 1.2s ${delay}ms infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ borderTop: '1.5px solid #e2dcf8', padding: '1rem 1.25rem', background: '#f7f4ff' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder='Bijv: "welke actieweek in 2024 leverde de meest loyale klanten op?"'
              style={{ flex: 1, padding: '11px 14px', border: '1.5px solid #cec6f5', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#1a1535', background: '#fff', outline: 'none' }}
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{ padding: '11px 20px', background: loading || !input.trim() ? '#a99fd4' : 'linear-gradient(135deg,#6c3fff,#ff4fc8)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#fff', whiteSpace: 'nowrap' }}>
              Verstuur →
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#a99fd4', marginTop: 6 }}>🔒 AI ziet alleen geaggregeerde statistieken — geen namen of telefoonnummers</div>
        </div>
      </div>
    </div>
  )
}
