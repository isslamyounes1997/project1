import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

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

    const rows = data || []
    // Merge chunks terug naar originele imports
    const parents = rows.filter((r: any) => !r.parent_id)
    const children = rows.filter((r: any) => r.parent_id)

    const merged = parents.map((parent: any) => {
      const childChunks = children
        .filter((c: any) => c.parent_id === parent.id)
        .sort((a: any, b: any) => (a.chunk_index || 0) - (b.chunk_index || 0))
      const allData = [...(parent.data || []), ...childChunks.flatMap((c: any) => c.data || [])]
      return {
        id: parent.id,
        label: parent.label,
        import_date: parent.import_date,
        date: parent.import_date,
        count: allData.length,
        data: allData,
      }
    })

    return NextResponse.json(merged)
  } catch (e: any) {
    console.error('GET imports error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await req.json()

    const row: any = {
      id: body.id,
      label: body.label,
      import_date: body.import_date,
      count: body.count,
      data: body.data,
    }
    if (body.parent_id) row.parent_id = body.parent_id
    if (body.chunk_index !== undefined) row.chunk_index = body.chunk_index
    if (body.chunk_total !== undefined) row.chunk_total = body.chunk_total

    const { error } = await supabase
      .from('imports')
      .upsert(row, { onConflict: 'id' })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('POST import error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
