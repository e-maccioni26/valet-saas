import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('token', params.token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ticket: data })
}
