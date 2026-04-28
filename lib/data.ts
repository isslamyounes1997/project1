import type { SlimRecord, Klant, ImportRecord } from './supabase'

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const str = s.toString().trim()
  // dd/mm/yy or dd/mm/yyyy
  const dmy = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/.exec(str)
  if (dmy) {
    let [, d, m, y] = dmy
    const year = y.length === 2 ? (parseInt(y) < 50 ? '20' + y : '19' + y) : y
    const dt = new Date(parseInt(year), parseInt(m) - 1, parseInt(d))
    return isNaN(dt.getTime()) ? null : dt
  }
  // ISO yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
  if (iso) {
    const dt = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
    return isNaN(dt.getTime()) ? null : dt
  }
  const dt = new Date(str)
  return isNaN(dt.getTime()) ? null : dt
}

export function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 864e5)
}

export function getSeg(orders: number, span: number | null): Klant['seg'] {
  if (orders <= 1) return 'new'
  if (!span) return 'new'
  const f = span / Math.max(orders - 1, 1)
  return f <= 9 ? 'weekly' : f <= 35 ? 'monthly' : 'sporadic'
}

export function segLabel(s: Klant['seg']): string {
  return { weekly: 'Wekelijks', monthly: 'Maandelijks', sporadic: 'Incidenteel', new: 'Eenmalig' }[s]
}

export function clientKey(d: { telefoon?: string; naam?: string }): string {
  const tel = (d.telefoon || '').replace(/\D/g, '').slice(-9)
  if (tel.length >= 7) return 'tel:' + tel
  return 'naam:' + (d.naam || '').toLowerCase().trim()
}

export function expandRecord(d: SlimRecord): Omit<Klant, 'seg' | 'freq' | 'visitCount' | 'isMultiChannel'> {
  return {
    voornaam: d.vn || '',
    achternaam: d.an || '',
    naam: ((d.vn || '') + ' ' + (d.an || '')).trim(),
    telefoon: d.t || '',
    email: d.e || '',
    orders: d.o || 1,
    omzet: d.om || 0,
    kanaal: (d.k === 'website' ? 'website' : 'platform') as 'website' | 'platform',
    first: d.f ? new Date(d.f) : null,
    last: d.l ? new Date(d.l) : null,
    vestiging: d.v || '',
  }
}

export function slimRecord(d: Partial<Klant>): SlimRecord {
  return {
    vn: d.voornaam || '',
    an: d.achternaam || '',
    t: (d.telefoon || '').replace(/\D/g, '').slice(-9),
    e: d.email || '',
    o: d.orders || 1,
    om: d.omzet || 0,
    k: d.kanaal || 'platform',
    f: d.first ? d.first.toISOString().slice(0, 10) : null,
    l: d.last ? d.last.toISOString().slice(0, 10) : null,
    v: d.vestiging || '',
  }
}

export function processRecord(rec: Record<string, string>): Partial<Klant> {
  let vn = rec.voornaam || ''
  let an = rec.achternaam || ''
  if (!vn && !an && rec.naam) {
    const parts = rec.naam.trim().split(/\s+/)
    vn = parts[0]
    an = parts.slice(1).join(' ')
  }
  const orders = parseInt(rec.orders) || 1
  const omzet = parseFloat((rec.omzet || '0').replace(',', '.')) || 0
  const first = parseDate(rec.eerste)
  const last = parseDate(rec.laatste) || parseDate(rec.eerste)
  const span = daysBetween(first, last)
  const freq = span && orders > 1 ? Math.round(span / (orders - 1)) : null
  const seg = getSeg(orders, span)
  const email = (rec.email || '').trim()
  const kanaal: 'website' | 'platform' = email && email.includes('@') ? 'website' : 'platform'
  return { voornaam: vn, achternaam: an, naam: `${vn} ${an}`.trim(), telefoon: rec.telefoon || '', email, orders, omzet, first, last, vestiging: rec.vestiging || '', seg, freq: freq ?? undefined, kanaal }
}

export function rebuildAllData(imports: ImportRecord[]): Klant[] {
  if (!imports.length) return []
  const master: Record<string, any> = {}

  imports.forEach((imp) => {
    imp.data.forEach((d) => {
      const rec = expandRecord(d)
      const k = clientKey(rec)
      if (!master[k]) {
        master[k] = { ...rec, visitWeeks: [], totalVisits: 0, kanalen: new Set(), cohortWeek: imp.id, cohortLabel: imp.label }
      }
      const ex = master[k]
      if (!ex.first || (rec.first && rec.first < ex.first)) ex.first = rec.first
      if (!ex.last || (rec.last && rec.last > ex.last)) ex.last = rec.last
      ex.orders = Math.max(ex.orders || 1, rec.orders || 1)
      if (rec.omzet > ex.omzet) ex.omzet = rec.omzet
      if (!ex.visitWeeks.includes(imp.id)) ex.visitWeeks.push(imp.id)
      ex.totalVisits = ex.visitWeeks.length
      if (rec.vestiging) ex.vestiging = rec.vestiging
      ex.kanalen.add(rec.kanaal)
      if (rec.email && rec.email.includes('@') && !ex.email) { ex.email = rec.email; ex.kanalen.add('website') }
    })
  })

  return Object.values(master).map((d) => {
    const span = daysBetween(d.first, d.last)
    const visits = d.totalVisits
    const effectiveOrders = Math.max(d.orders || 1, visits)
    const freq = span && effectiveOrders > 1 ? Math.round(span / (effectiveOrders - 1)) : null
    const seg = getSeg(effectiveOrders, span)
    const kanalen = [...d.kanalen] as string[]
    const kanaal: 'website' | 'platform' = d.email && d.email.includes('@') ? 'website' : 'platform'
    const isMultiChannel = kanalen.includes('website') && kanalen.includes('platform')
    return {
      ...d,
      orders: effectiveOrders,
      freq,
      seg,
      visitCount: visits,
      kanaal,
      isMultiChannel,
      avgOrderVal: d.omzet && effectiveOrders > 0 ? +(d.omzet / effectiveOrders).toFixed(2) : 0,
    } as Klant
  })
}

export function fmt(d: Date | null): string {
  return d ? d.toLocaleDateString('nl-NL') : '—'
}

export function fmtShort(d: Date | null): string {
  return d ? d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '—'
}

export function getWeekLabel(date: Date): string {
  const monday = new Date(date)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const wn = getWeekNum(monday)
  return `W${wn} (${fmtShort(monday)}–${fmtShort(sunday)})`
}

function getWeekNum(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - onejan.getTime()) / 864e5) + onejan.getDay() + 1) / 7)
}
