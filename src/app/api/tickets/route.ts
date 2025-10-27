import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shortCode, token } = body
  const eventId = process.env.DEFAULT_EVENT_ID

  console.log('📦 Reçu du front:', body)
  console.log('🎫 eventId utilisé:', eventId)

  const { data, error } = await supabase
    .from('tickets')
    .insert({ short_code: shortCode, token, event_id: eventId })
    .select()
    .single()

  if (error) {
    console.error('❌ Supabase error:', error)
    return NextResponse.json({ error }, { status: 400 })
  }

  console.log('✅ Ticket créé:', data)
  return NextResponse.json({ ticket: data })
}
