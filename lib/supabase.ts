import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type ImportRecord = {
  id: string
  label: string
  import_date: string
  count: number
  data: SlimRecord[]
}

export type SlimRecord = {
  vn: string   // voornaam
  an: string   // achternaam
  t: string    // telefoon
  e: string    // email
  o: number    // orders
  om: number   // omzet
  k: string    // kanaal
  f: string | null  // eerste bestelling
  l: string | null  // laatste bestelling
  v: string    // vestiging
}

export type Klant = {
  voornaam: string
  achternaam: string
  naam: string
  telefoon: string
  email: string
  orders: number
  omzet: number
  kanaal: 'website' | 'platform'
  first: Date | null
  last: Date | null
  vestiging: string
  seg: 'weekly' | 'monthly' | 'sporadic' | 'new'
  freq: number | null
  visitCount: number
  isMultiChannel: boolean
  cohortWeek?: string
}
