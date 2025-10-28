import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { data: reqRow, error: e0 } = await supabase.from('requests').select('*').eq('id', id).single()
  if (e0 || !reqRow) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // 1) Marquer la request traitée
  const { error: e1 } = await supabase
    .from('requests')
    .update({ handled_at: new Date().toISOString() })
    .eq('id', id)
  if (e1) return NextResponse.json({ error: e1 }, { status: 400 })

  // 2) Option: si c'était une récup, on remet le ticket en "parked" (ou "returned" selon ton process)
  if (reqRow.type === 'pickup') {
    await supabase.from('tickets').update({ status: 'parked' }).eq('id', reqRow.ticket_id)
  }

  return NextResponse.json({ ok: true })
}
