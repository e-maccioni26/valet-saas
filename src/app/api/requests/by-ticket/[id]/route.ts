import { NextResponse } from 'next/server'
import { supabaseServerAdmin } from '../../../../lib/supabaseServer'

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> } // ✅ params async sous Next 16
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 })
  }

  // 🔍 On récupère la dernière requête associée à ce ticket
  const { data, error } = await supabaseServerAdmin
    .from('requests')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('❌ Request not found for ticket:', error)
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  return NextResponse.json({ request: data })
}