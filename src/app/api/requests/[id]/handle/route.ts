import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabaseServer'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServer()
  const { id } = params

  const { error } = await supabase
    .from('requests')
    .update({ handled_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('❌ Supabase update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}