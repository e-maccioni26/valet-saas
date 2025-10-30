import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  // ✅ on attend la promesse "params"
  const { token } = await context.params

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    console.error('❌ Ticket not found or query error:', error)
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ ticket: data })
}
