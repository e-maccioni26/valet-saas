// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../lib/supabaseServer'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data.session })
}
