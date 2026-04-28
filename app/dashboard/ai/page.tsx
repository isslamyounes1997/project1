'use client'
import { useState, useRef, useEffect } from 'react'
import { useData } from '@/app/context/DataContext'
import { useAuth } from '@/app/context/AuthContext'
import { segLabel } from '@/lib/data'

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
  const withFreq = allData.filter((d: any) => d.freq > 0)
  const avgInt = withFreq.length ? Math.round(withFreq.reduce((s: number, d: any) => s + d.freq, 0) / withFreq.length) : null
  const hasOmzet = allData.some((d: any) => d.omzet > 0)
  const totalOmzet = allData.reduce((s: number, d: any) => s + (d.omzet || 0), 0)
  const vm: Record<string, any> = {}
  allData.forEach((d: any) => {
    if (!d.vestiging) return
    if (!vm[d.vestiging]) vm[d.vestiging] = { tot: 0, ret: 0, wk: 0, omzet: 0, freqSum: 0, freqCnt: 0 }
    vm[d.vestiging].tot++; if (d.orders > 1) vm[d.vestiging].ret++; if (d.seg === 'weekly') vm[d.vestiging].wk++
    vm[d.vestiging].omzet += (d.omzet || 0); if (d.freq > 0) { vm[d.vestiging].freqSum += d.freq; vm[d.vestiging].freqCnt++ }
  })
  const vestLines = Object.entries(vm).sort((a: any, b: any) => b[1].tot - a[1].tot).map(([v, s]: any) =>
    `- ${v}: ${s.tot} klanten, ${s.tot ? Math.round(s.ret/s.tot*100) : 0}% terugkerend, ${s.tot ? Math.round(s.wk/s.tot*100) : 0}% wekelijks, gem. interval: ${s.freqCnt ? Math.round(s.freqSum/s.freqCnt) : '?'}d${hasOmzet && s.tot ? `, LTV: €${(s.omzet/s.tot).toFixed(2)}` : ''}`
  ).join('\n')
  return `KLANTENDATA:\n- Totaal: ${tot} unieke klanten | ${Math.round(ret/tot*100)}% terugkerend\n- Segmenten: Wekelijks ${wk} (${Math.round(wk/tot*100)}%), Maandelijks ${mn} (${Math.round(mn/tot*100)}%), Incidenteel ${sp} (${Math.round(sp/tot*100)}%), Eenmalig ${nw} (${Math.round(nw/tot*100)}%)\n- Gem. interval: ${avgInt ? avgInt+'d' : '?'}\n- Website: ${web} | Platform: ${plat} | Beide: ${multi}\n${hasOmzet ? `- Totale omzet: €${totalOmzet.toFixed(2)} | Gem. LTV: €${(totalOmzet/tot).toFixed(2)}` : ''}\n- Imports: ${importHistory.length}\n\nVESTIGINGEN:\n${vestLines}`
}

const SUGGESTIONS = [
  'Beste vestiging qua retentie?',
  'Website vs Thuisbezorgd vergelijking',
  'Hoeveel incidentele klanten kan ik activeren?',
  'Geef me een marketingadvies op basis van mijn data',
  'Welke vestigingen presteren onder het gemiddelde?',
  'Hoeveel klanten dreig ik te verliezen?',
  'Verschil in LTV: website vs platform?',
  'Wat is het gemiddeld interval per vestiging?',
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
          max_tokens: 1000,
          system: `Je bent een data-analist voor een Domino's franchise netwerk. Gebruik deze data:\n\n${context}\n\nBeantwoord vragen in het Nederlands. Wees concreet, gebruik de cijfers. Geef actionable marketing inzichten. Max 3-4 zinnen tenzij meer detail gevraagd.`,
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
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>✨</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.4px' }}>AI Data Assistent</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Stel vragen over jouw klantendata in gewoon Nederlands</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tot > 0 && <>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)' }}>{importHistory.length} imports</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(108,63,255,.1)', color: 'var(--accent)' }}>{vests.length} vestigingen</span>
          </>}
        </div>
      </div>

      {/* Stats row */}
      {tot > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[['👥','Klanten',tot.toLocaleString('nl-NL')],['🔄','Terugkerend',`${Math.round(ret/tot*100)}%`],['🌐','Via website',web.toLocaleString('nl-NL')],['🏪','Vestigingen',vests.length]].map(([icon,l,v]) => (
            <div key={l} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
              <div><div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{l}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)} style={{ padding: '5px 12px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'var(--accent)', fontFamily: 'inherit', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget.style.background='var(--surface2)'); (e.currentTarget.style.borderColor='var(--accent)') }}
            onMouseLeave={e => { (e.currentTarget.style.background='#fff'); (e.currentTarget.style.borderColor='var(--border2)') }}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 380, maxHeight: 480, overflowY: 'auto' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✨</div>
              <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, maxWidth: '85%' }}>
                Hoi! Ik ben je data-assistent en heb toegang tot alle geïmporteerde klantendata. Stel me een vraag of klik op een suggestie hierboven.
                {!tot && <span> <strong>Let op:</strong> er is nog geen data geladen — importeer eerst een CSV.</span>}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.role === 'user' ? 'var(--surface2)' : 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: m.role === 'user' ? 11 : 14, fontWeight: 700, color: m.role === 'user' ? 'var(--accent)' : '#fff', flexShrink: 0 }}>
                {m.role === 'user' ? user?.initials || 'JG' : '✨'}
              </div>
              <div style={{ background: m.role === 'user' ? 'linear-gradient(135deg,rgba(108,63,255,.12),rgba(255,79,200,.08))' : 'var(--surface2)', border: `1.5px solid ${m.role === 'user' ? 'rgba(108,63,255,.2)' : 'var(--border)'}`, borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✨</div>
              <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
                {[0,200,400].map(delay => <div key={delay} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text3)', animation: `dotPulse 1.2s ${delay}ms infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ borderTop: '1.5px solid var(--border)', padding: '1rem 1.25rem', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Bijv: welke vestiging heeft de meeste terugkerende klanten?"
              style={{ flex: 1, padding: '11px 14px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', outline: 'none' }} />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ padding: '11px 20px', background: loading || !input.trim() ? 'var(--text3)' : 'linear-gradient(135deg,#6c3fff,#ff4fc8)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#fff', whiteSpace: 'nowrap' }}>
              Verstuur →
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>🔒 De AI ziet alleen geaggregeerde statistieken — geen namen of telefoonnummers</div>
        </div>
      </div>
    </div>
  )
}
