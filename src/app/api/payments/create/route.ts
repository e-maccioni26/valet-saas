import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type Stripe from 'stripe'

type Body = {
  requestId?: string
  eventId: string
  currency?: string     // default: 'eur'
  serviceAmount: number // en cents (ex: 1500 = 15,00€)
  tipAmount?: number    // en cents
  notes?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    // --- 🔒 Validation basique ---
    if (!body || !body.eventId || typeof body.serviceAmount !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const currency = (body.currency || 'eur').toLowerCase()
    const serviceAmount = Math.max(0, Math.floor(body.serviceAmount))
    const tipAmount = Math.max(0, Math.floor(body.tipAmount || 0))

    // Anti-manipulation
    if (serviceAmount < 100 || serviceAmount > 100_000) {
      return NextResponse.json({ error: 'Service amount out of bounds' }, { status: 400 })
    }
    if (tipAmount > 50_000) {
      return NextResponse.json({ error: 'Tip too large' }, { status: 400 })
    }

    // --- 🔐 Supabase server client (session côté serveur) ---
const cookieStore = await cookies();

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      async get(name: string) {
        const store = await cookies();
        return store.get(name)?.value;
      },
    },
  }
);

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Profil utilisateur ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', user.id)
      .maybeSingle()

    // --- Création Stripe Customer ---
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
      metadata: { supabase_user_id: user.id },
    })

    // --- Ligne(s) Stripe Checkout ---
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency,
          product_data: {
            name: 'Service de voiturier',
            metadata: {
              event_id: body.eventId,
              request_id: body.requestId ?? '',
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

    // --- Enregistrement en base : paiement "pending" ---
const { data: paymentRow, error: insertErr } = await supabase
  .from('payments')
  .insert({
    request_id: body.requestId && body.requestId !== '' ? body.requestId : null, // ✅ vérification
    event_id: body.eventId,
    valet_id: user.id,
    currency,
    service_amount: serviceAmount / 100,
    tip_amount: tipAmount / 100,
    payment_status: 'pending',
    notes: body.notes ?? null,
    metadata: {},
  })
  .select('id')
  .single()

    if (insertErr || !paymentRow) {
      console.error('supabase insert error', insertErr)
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    // --- URLs Stripe ---
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/valet/payments?success=1`
    const cancelUrl = `${baseUrl}/valet/payments?canceled=1`

    // --- Création session Stripe Checkout ---
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      line_items,
      currency,
      success_url: successUrl,
      cancel_url: cancelUrl,
      invoice_creation: { enabled: true },
      metadata: {
        supabase_payment_id: paymentRow.id,
        event_id: body.eventId,
        request_id: body.requestId ?? '',
        supabase_user_id: user.id,
      },
    })

    // --- Mise à jour en DB avec les IDs Stripe ---
    await supabase
      .from('payments')
      .update({
        stripe_session_id: session.id,
        stripe_customer_id: customer.id,
      })
      .eq('id', paymentRow.id)

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (e: any) {
    console.error('create checkout error', e)
    return NextResponse.json(
      { error: 'Server error', details: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}