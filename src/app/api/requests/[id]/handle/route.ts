import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// ✅ Crée un client Supabase sécurisé (clé service)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // clé service = full access
  { auth: { persistSession: false } }
)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
    }

    // ✅ Met à jour la demande dans Supabase
    const { error } = await supabase
      .from('requests')
      .update({
        handled_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('❌ Supabase update error:', error.message)
      return NextResponse.json(
        { error: 'Failed to update request', details: error.message },
        { status: 500 }
      )
    }

    // ✅ Rafraîchit la page dashboard côté serveur (cache ISR)
    revalidatePath('/valet/dashboard')

    console.log(`✅ Request ${id} marked as handled`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('🚨 Unexpected server error:', err)
    return NextResponse.json(
      { error: 'Unexpected server error', details: String(err) },
      { status: 500 }
    )
  }
}