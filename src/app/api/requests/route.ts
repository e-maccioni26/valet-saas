import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { data, error } = await supabase.from('requests').insert({
    ticket_id: payload.ticketId,
    type: payload.type,
    pickup_eta_minutes: payload.pickup_eta_minutes ?? null,
    pickup_at: payload.pickup_at ?? null,
    comment: payload.comment ?? null
  }).select().single();

  if (error) return NextResponse.json({ error }, { status: 400 });

  // Optionnel: mettre le ticket en "requested"
  await supabase.from('tickets').update({ status: 'requested' }).eq('id', payload.ticketId);

  return NextResponse.json({ request: data });
}
