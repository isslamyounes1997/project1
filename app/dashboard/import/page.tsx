'use client'
import { useState, useCallback } from 'react'
import { useData } from '@/app/context/DataContext'
import { useRouter } from 'next/navigation'
import { processRecord, getWeekLabel, slimRecord } from '@/lib/data'
import type { Klant } from '@/lib/supabase'

const FIELDS = [
  { key: 'voornaam',  label: 'Voornaam',           required: false, keywords: ['voornaam','first name','firstname','voor'] },
  { key: 'achternaam',label: 'Achternaam',          required: false, keywords: ['naam','achternaam','last name','lastname'] },
  { key: 'adres',     label: 'Adres',               required: false, keywords: ['straat','adres','address','street'] },
  { key: 'telefoon',  label: 'Telefoon',            required: false, keywords: ['tel','telefoon','phone','mobiel','gsm'] },
  { key: 'email',     label: 'E-mail',              required: false, keywords: ['e-mail','email','mail'] },
  { key: 'orders',    label: 'Aantal bestellingen', required: true,  keywords: ['orders','bestelling','bestellingen','aantal','count','purchases'] },
  { key: 'omzet',     label: 'Totaal besteed (€)',  required: false, keywords: ['omzet','besteed','totaal besteed','uitgegeven','revenue','spend'] },
  { key: 'laatste',   label: 'Laatste bestelling',  required: true,  keywords: ['laatste bestelling','laatste','last','last order','datum laatste'] },
  { key: 'eerste',    label: 'Eerste bestelling',   required: true,  keywords: ['klant sinds','eerste bestelling','eerste','first','registratie','created'] },
  { key: 'vestiging', label: 'Vestiging',           required: false, keywords: ['winkel','vestiging','branch','locatie','store','franchise'] },
]

const EXACT: Record<string, string> = {
  'voornaam': 'voornaam', 'naam': 'achternaam', 'straat': 'adres',
  'tel': 'telefoon', 'e-mail': 'email', 'orders': 'orders',
  'omzet': 'omzet', 'totaal besteed': 'omzet', 'besteed': 'omzet',
  'laatste bestelling': 'laatste', 'klant sinds': 'eerste', 'winkel': 'vestiging',
}
const SKIP = ['cust']

type Mapping = { field: string; confidence: 'high' | 'med' | 'low' | 'none' }

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const fl = text.split(/\r?\n/)[0]
  const sep = fl.includes(';') ? ';' : fl.includes('\t') ? '\t' : ','
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  function pl(line: string) {
    const c: string[] = []; let cur = '', q = false
    for (const ch of line) { if (ch === '"') { q = !q } else if (ch === sep && !q) { c.push(cur.trim()); cur = '' } else cur += ch }
    c.push(cur.trim())
    return c.map(x => x.replace(/^"|"$/g, '').trim())
  }
  const headers = pl(lines[0])
  const rows = lines.slice(1).map(pl).filter(r => r.some(c => c))
  return { headers, rows }
}

function autoMap(headers: string[], rows: string[][]): Record<number, Mapping> {
  const mapping: Record<number, Mapping> = {}
  const used = new Set<string>()
  headers.forEach((hdr, idx) => {
    const h = hdr.toLowerCase().trim()
    if (SKIP.includes(h)) { mapping[idx] = { field: '__skip__', confidence: 'none' }; return }
    if (EXACT[h] && !used.has(EXACT[h])) { mapping[idx] = { field: EXACT[h], confidence: 'high' }; used.add(EXACT[h]); return }
    let best: typeof FIELDS[0] | null = null; let bestScore = 0
    FIELDS.forEach(f => {
      if (used.has(f.key)) return
      let score = 0
      if (f.keywords.includes(h)) score = 100
      else if (f.keywords.some(k => h.includes(k) || k.includes(h))) score = 70
      else if (f.keywords.some(k => h.split(/[\s_\-\/]+/).some(w => k.includes(w) && w.length > 2))) score = 40
      const sample = rows.slice(0, 5).map(r => r[idx] || '').join(' ')
      if (f.key === 'email' && /@/.test(sample)) score = Math.max(score, 90)
      if (f.key === 'telefoon' && /^[\d\s\+\-\(\)]{7,}$/.test(rows[0]?.[idx] || '')) score = Math.max(score, 85)
      if (f.key === 'orders' && /^\d+$/.test((rows[0]?.[idx] || '').trim())) score = Math.max(score, 75)
      if ((f.key === 'eerste' || f.key === 'laatste') && /\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(sample)) score = Math.max(score, 80)
      if (score > bestScore) { bestScore = score; best = f }
    })
    if (best && bestScore >= 40) { mapping[idx] = { field: (best as any).key, confidence: bestScore >= 90 ? 'high' : bestScore >= 60 ? 'med' : 'low' }; used.add((best as any).key) }
    else mapping[idx] = { field: '__skip__', confidence: 'none' }
  })
  return mapping
}

export default function ImportPage() {
  const [step, setStep] = useState(1)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, Mapping>>({})
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { saveImport, importHistory } = useData()
  const router = useRouter()

  const onFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const { headers: h, rows: r } = parseCSV(e.target!.result as string)
      setHeaders(h); setRows(r)
      setMapping(autoMap(h, r))
      setStep(2)
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const updateMap = (idx: number, value: string) => {
    setMapping(prev => {
      const next = { ...prev }
      if (value !== '__skip__') {
        Object.keys(next).forEach(i => { if (parseInt(i) !== idx && next[parseInt(i)].field === value) next[parseInt(i)] = { field: '__skip__', confidence: 'none' } })
      }
      next[idx] = { field: value, confidence: 'high' }
      return next
    })
  }

  const validate = () => {
    const required = FIELDS.filter(f => f.required).map(f => f.key)
    const mapped = Object.values(mapping).map(m => m.field).filter(f => f !== '__skip__')
    const missing = required.filter(r => !mapped.includes(r))
    if (missing.length) { setError('Verplichte velden niet gekoppeld: ' + missing.map(k => FIELDS.find(f => f.key === k)?.label).join(', ')); return }
    setError(''); setStep(3)
  }

  const doImport = async () => {
    setSaving(true); setError('')
    try {
      const idxMap: Record<string, number> = {}
      Object.entries(mapping).forEach(([idx, m]) => { if (m.field !== '__skip__') idxMap[m.field] = parseInt(idx) })
      const get = (row: string[], key: string) => idxMap[key] !== undefined ? (row[idxMap[key]] || '') : ''
      const records = rows.map(row => processRecord({
        voornaam: get(row, 'voornaam'), achternaam: get(row, 'achternaam'), naam: get(row, 'naam'),
        adres: get(row, 'adres'), telefoon: get(row, 'telefoon'), email: get(row, 'email'),
        orders: get(row, 'orders'), omzet: get(row, 'omzet'),
        eerste: get(row, 'eerste'), laatste: get(row, 'laatste'), vestiging: get(row, 'vestiging'),
      })).filter(r => r.naam || r.voornaam) as Klant[]

      const chosenDate = new Date(importDate)
      const label = getWeekLabel(isNaN(chosenDate.getTime()) ? new Date() : chosenDate)
      const id = 'imp_' + Date.now()

      await saveImport({ id, label, date: chosenDate.toISOString(), count: records.length, data: records.map(slimRecord as any) })
      router.push('/dashboard')
    } catch (e: any) {
      setError('Opslaan mislukt: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.5px', marginBottom: '2rem' }}>📂 CSV importeren</div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {['Upload', 'Kolommen', 'Bevestigen'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: step > i + 1 ? 'var(--green)' : step === i + 1 ? 'linear-gradient(135deg,#6c3fff,#ff4fc8)' : 'var(--surface2)', color: step >= i + 1 ? '#fff' : 'var(--text3)' }}>{step > i + 1 ? '✓' : i + 1}</div>
            <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? 'var(--text)' : 'var(--text3)' }}>{s}</span>
            {i < 2 && <span style={{ color: 'var(--text3)' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div>
          <label>
            <div
              style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '3.5rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(108,63,255,.02)', transition: 'all .2s' }}
              onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = 'rgba(108,63,255,.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
              onDragLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = '' }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Sleep je CSV hier naartoe of klik om te kiezen</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Kolomnamen en volgorde maakt niet uit — het systeem herkent het automatisch.</div>
              <div style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Bestand kiezen</div>
            </div>
            <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          </label>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div>
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.35rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)', marginBottom: 10 }}>Voorbeeld van je data</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{headers.map(h => <th key={h} style={{ padding: '6px 10px', background: 'var(--surface2)', color: 'var(--text2)', fontWeight: 600, borderBottom: '1.5px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 3).map((r, i) => <tr key={i}>{headers.map((_, j) => <td key={j} style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[j] || ''}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {[['var(--green)','Automatisch herkend'],['var(--amber)','Controleer even'],['var(--border2)','Niet gebruikt']].map(([c,l]) => <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}><div style={{ width: 9, height: 9, borderRadius: 3, background: c }} />{l}</div>)}
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: '1.5rem' }}>
            {headers.map((hdr, idx) => {
              const m = mapping[idx]
              const sample = rows.slice(0, 2).map(r => r[idx] || '').filter(Boolean).join(', ')
              const isOk = m?.field !== '__skip__' && m?.confidence === 'high'
              const isWarn = m?.field !== '__skip__' && m?.confidence !== 'high'
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr 28px', alignItems: 'center', gap: 10, background: isOk ? 'var(--green-bg)' : isWarn ? 'var(--amber-bg)' : '#fff', border: `1.5px solid ${isOk ? 'var(--green)' : isWarn ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hdr}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sample}</div>
                  </div>
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>→</div>
                  <select value={m?.field || '__skip__'} onChange={e => updateMap(idx, e.target.value)} style={{ width: '100%', padding: '6px 9px', border: '1.5px solid var(--border2)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                    <option value="__skip__">— Niet gebruiken —</option>
                    {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                  <div style={{ textAlign: 'center', fontSize: 15 }}>{m?.field === '__skip__' ? '⬜' : m?.confidence === 'high' ? '✅' : '⚠️'}</div>
                </div>
              )
            })}
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(1)} style={{ padding: '8px 16px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>← Terug</button>
            <button onClick={validate} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#6c3fff,#ff4fc8)', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>Doorgaan →</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.25rem' }}>
            {[['Klanten', rows.length], ['Gekoppeld', Object.values(mapping).filter(m=>m.field!=='__skip__').length], ['Overgeslagen', Object.values(mapping).filter(m=>m.field==='__skip__').length], ['Status','✓']].map(([l,v]) => (
              <div key={l} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: l==='Status'?'var(--green)':'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>📅 Datum van deze import</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: '#fff', outline: 'none', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>→ {getWeekLabel(new Date(importDate))}</span>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.25rem' }}>
            {Object.entries(mapping).filter(([,m]) => m.field !== '__skip__').map(([idx, m]) => {
              const fl = FIELDS.find(f => f.key === m.field)?.label || m.field
              return <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span>✅</span><span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text2)', flex: 1 }}>{headers[parseInt(idx)]}</span>
                <span style={{ color: 'var(--text3)' }}>→</span><span style={{ fontWeight: 600 }}>{fl}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>{rows[0]?.[parseInt(idx)] || ''}</span>
              </div>
            })}
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 16px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>← Aanpassen</button>
            <button onClick={doImport} disabled={saving} style={{ padding: '10px 24px', background: saving ? 'var(--text3)' : 'linear-gradient(135deg,#6c3fff,#ff4fc8)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#fff' }}>
              {saving ? '⏳ Opslaan...' : '🚀 Importeren'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
