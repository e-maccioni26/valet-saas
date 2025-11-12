import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseServerAdmin } from '../../../lib/supabaseServer'

export const dynamic = 'force-dynamic' // pas de cache
export const runtime = 'nodejs'        // recommandé pour webhooks

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const buf = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return new NextResponse('Bad signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.supabase_payment_id
        if (!paymentId) break

        await supabaseServerAdmin
          .from('payments')
          .update({
            payment_status: 'succeeded',
            stripe_payment_intent_id: session.payment_intent?.toString() ?? null,
            stripe_receipt_url: (session as any).receipt_url ?? null, // parfois dispo via charge
            paid_at: new Date().toISOString(),
            last_webhook_event: event.type,
          })
          .eq('id', paymentId)
        break
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.supabase_payment_id
        if (paymentId) {
          await supabaseServerAdmin
            .from('payments')
            .update({ payment_status: 'failed', last_webhook_event: event.type })
            .eq('id', paymentId)
        }
        break
      }
      default:
        // autres événements si besoin
        break
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('Webhook handler error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}