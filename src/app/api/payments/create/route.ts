import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'

type Body = {
  requestId?: string | null
  eventId: string
  currency?: string
  serviceAmount: number // cents
  tipAmount?: number    // cents
  notes?: string
}

function isUuid(v?: string | null) {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(Math.floor(n || 0), a), b)

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body?.eventId || typeof body.serviceAmount !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const currency = (body.currency || 'eur').toLowerCase()
    const serviceAmount = clamp(body.serviceAmount, 100, 100_000)
    const tipAmount = clamp(body.tipAmount ?? 0, 0, 50_000)

    // ✅ Cookies Next 16 (cookies() est async)
    const cookieStore = await (await import('next/headers')).cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ✅ Vérifier l’appartenance à l’événement
    const { data: ue } = await supabase
      .from('user_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', body.eventId)
      .maybeSingle()

    if (!ue) return NextResponse.json({ error: 'Forbidden (event)' }, { status: 403 })

    // ✅ requestId : n’ajouter que si c’est un vrai requests.id
    let requestId: string | null = null
    if (isUuid(body.requestId)) {
      const { data: exists } = await supabase
        .from('requests')
        .select('id')
        .eq('id', body.requestId)
        .maybeSingle()
      if (exists?.id) requestId = exists.id
    }

    // ✅ Customer Stripe (facultatif)
    const { data: profile } = await supabase.from('profiles')
      .select('first_name,last_name')
      .eq('id', user.id)
      .maybeSingle()
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
      metadata: { supabase_user_id: user.id },
    })

    // ✅ Insert pending (NE PAS toucher total_amount)
    const { data: paymentRow, error: insertErr } = await supabase
      .from('payments')
      .insert({
        request_id: requestId,
        event_id: body.eventId,
        valet_id: user.id,
        currency,
        service_amount: serviceAmount / 100,
        tip_amount: tipAmount / 100,
        payment_status: 'pending',
        notes: body.notes ?? null,
        metadata: { source: 'private' },
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('supabase insert error', insertErr)
      return NextResponse.json({ error: 'DB insert failed', details: insertErr.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            product_data: { name: 'Service voiturier', metadata: { type: 'service', event_id: body.eventId, request_id: requestId ?? '' } },
            unit_amount: serviceAmount,
          },
        },
        ...(tipAmount > 0 ? [{
          quantity: 1,
          price_data: {
            currency,
            product_data: { name: 'Pourboire', metadata: { type: 'tip' } },
            unit_amount: tipAmount,
          },
        }] as any : []),
      ],
      success_url: `${baseUrl}/valet/payments?success=1`,
      cancel_url: `${baseUrl}/valet/payments?canceled=1`,
      invoice_creation: { enabled: true },
      metadata: {
        supabase_payment_id: paymentRow.id,
        event_id: body.eventId,
        request_id: requestId ?? '',
        supabase_user_id: user.id,
      },
    })

    await supabase
      .from('payments')
      .update({ stripe_session_id: session.id, stripe_customer_id: customer.id })
      .eq('id', paymentRow.id)

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('create checkout error', e)
    return NextResponse.json({ error: 'Server error', details: String(e?.message ?? e) }, { status: 500 })
  }
}