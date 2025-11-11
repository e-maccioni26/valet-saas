// src/app/api/payments/webhook/route.ts
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // facultatif : timeout long pour Stripe webhooks

// Helper pour lire le raw body (obligatoire pour vérifier la signature)
async function getRawBody(req: Request): Promise<Buffer> {
  const reader = req.body?.getReader()
  const chunks: Uint8Array[] = []
  if (reader) {
    // @ts-ignore
    let done = false
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      if (value) chunks.push(value)
      done = doneReading
    }
  }
  return Buffer.concat(chunks)
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() { return undefined }, // pas besoin pour admin simple
      },
    }
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.supabase_payment_id
        const receiptUrl = session.invoice?.hosted_invoice_url ?? null

        if (paymentId) {
          await supabase
            .from('payments')
            .update({
              stripe_session_id: session.id,
              stripe_customer_id: session.customer?.toString() || null,
              stripe_receipt_url: receiptUrl,
              payment_status: 'succeeded',
              last_webhook_event: event.type,
              paid_at: new Date().toISOString(),
              total_amount:
                typeof session.amount_total === 'number'
                  ? session.amount_total / 100
                  : undefined,
            })
            .eq('id', paymentId)
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        // Si on avait mémorisé l’ID du PI (optionnel)
        const paymentId = (pi.metadata as any)?.supabase_payment_id
        if (paymentId) {
          await supabase
            .from('payments')
            .update({
              payment_status: 'failed',
              last_webhook_event: event.type,
            })
            .eq('id', paymentId)
        }
        break
      }
      default:
        // Loggue mais ne casse pas
        await supabase
          .from('payments')
          .update({ last_webhook_event: event.type })
          .is('id', null) // no-op pour ne rien casser
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('Webhook handler error', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}