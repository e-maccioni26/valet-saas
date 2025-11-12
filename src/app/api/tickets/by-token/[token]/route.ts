import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> } // ✅ param asynchrone
) {
  const { token } = await context.params            // ✅ on attend la promesse

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) {
    console.error('❌ Ticket not found or query error:', error)
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ ticket: data })
}