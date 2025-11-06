import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseServerAdmin } from '../../../../lib/supabaseServer' 

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
  }

  try {
    // ✅ utiliser le client admin
    const { error } = await supabaseServerAdmin
      .from('requests')
      .update({ handled_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('❌ Supabase update error:', error.message)
      return NextResponse.json(
        { error: 'Failed to update request', details: error.message },
        { status: 500 }
      )
    }

    revalidatePath('/valet/dashboard')
    console.log(`✅ Request ${id} marked as handled`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('🚨 Unexpected server error:', err)
    return NextResponse.json(
      { error: 'Unexpected server error', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}