import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseServerAdmin } from '../../../lib/supabaseServer'

type Body = {
  token: string
  serviceAmount: number // en cents (1500 = 15,00€)
  tipAmount?: number    // en cents
  notes?: string
}

function clampInt(v: any, min: number, max: number) {
  const n = Math.max(min, Math.floor(Number(v) || 0))
  return Math.min(n, max)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body?.token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // 1) Ticket à partir du token
    const { data: ticket, error: tErr } = await supabaseServerAdmin
      .from('tickets')
      .select('id, event_id, short_code')
      .eq('token', body.token)
      .maybeSingle()

    if (tErr || !ticket) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // 2) Dernière request liée à ce ticket (handled ou la plus récente)
    const { data: request } = await supabaseServerAdmin
      .from('requests')
      .select('id, handled_at')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // requestId peut être null, la FK l’accepte
    const requestId = request?.id ?? null

    // 3) Normalisation montants (anti-manipulation)
    const serviceAmount = clampInt(body.serviceAmount, 100, 100_000) // 1€–1000€
    const tipAmount = clampInt(body.tipAmount ?? 0, 0, 50_000)       // 0–500€

    // 4) Prépare les line_items Stripe
    const currency = 'eur'
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency,
          product_data: {
            name: 'Service voiturier',
            metadata: {
              event_id: ticket.event_id,
              ticket_id: ticket.id,
              request_id: requestId ?? '',
              type: 'service',
            },
          },
          unit_amount: serviceAmount,
        },
      },
    ]
    if (tipAmount > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          product_data: { name: 'Pourboire', metadata: { type: 'tip' } },
          unit_amount: tipAmount,
        },
      })
    }

    // 5) Enregistrer un paiement "pending" AVANT la session
    const { data: paymentRow, error: pErr } = await supabaseServerAdmin
      .from('payments')
      .insert({
        request_id: requestId,          // peut être null
        event_id: ticket.event_id,
        valet_id: null,                 // invité → pas d’utilisateur
        currency,
        service_amount: serviceAmount / 100, // ta table est en €
        tip_amount: tipAmount / 100,
        // total_amount est généré → NE PAS envoyer
        payment_status: 'pending',
        notes: body.notes ?? null,
        metadata: { source: 'public' },
      })
      .select('id')
      .single()

    if (pErr || !paymentRow) {
      console.error('DB insert failed', pErr)
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${baseUrl}/r/${body.token}?success=1`,
      cancel_url: `${baseUrl}/r/${body.token}?canceled=1`,
      invoice_creation: { enabled: true },
      metadata: {
        supabase_payment_id: paymentRow.id,
        event_id: ticket.event_id,
        request_id: requestId ?? '',
        ticket_id: ticket.id,
      },
    })

    await supabaseServerAdmin
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', paymentRow.id)

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('public checkout error', e)
    return NextResponse.json({ error: 'Server error', details: String(e?.message ?? e) }, { status: 500 })
  }
}