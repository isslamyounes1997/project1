import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('imports')
      .select('*')
      .order('import_date', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    console.error('GET imports error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { data, error } = await supabase
      .from('imports')
      .upsert(body, { onConflict: 'id' })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('POST import error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
