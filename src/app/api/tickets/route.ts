import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const { shortCode, token } = await req.json();
  const eventId = process.env.DEFAULT_EVENT_ID; // pour MVP, fixe ou passe en body

  const { data, error } = await supabase
    .from('tickets')
    .insert({ short_code: shortCode, token, event_id: eventId })
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ticket: data });
}
