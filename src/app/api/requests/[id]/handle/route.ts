import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabaseServer'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> } // 👈 params est une Promise maintenant
) {
  const supabase = await createSupabaseServer()
  
  // ⬇️ Attendre la résolution de params
  const { id } = await context.params

  console.log('🧩 ID reçu depuis la route:', id)

  if (!id) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
  }

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