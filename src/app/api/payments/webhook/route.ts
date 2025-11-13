import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { webhookLogger } from '@/lib/logger'
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionAsyncPaymentSucceeded,
  handleCheckoutSessionAsyncPaymentFailed,
  handleCheckoutSessionExpired,
  handleChargeSucceeded,
  handleChargeRefunded,
  handlePaymentIntentFailed,
} from '@/services/webhook.service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook endpoint pour recevoir les événements Stripe
 *
 * Configuration dans Stripe Dashboard :
 * - URL: https://your-domain.com/api/payments/webhook
 * - Événements à écouter :
 *   - checkout.session.completed
 *   - checkout.session.async_payment_succeeded
 *   - checkout.session.async_payment_failed
 *   - checkout.session.expired
 *   - charge.succeeded
 *   - charge.refunded
 *   - payment_intent.payment_failed
 */
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    webhookLogger.warn('Missing Stripe signature header')
    return new NextResponse('Missing signature', { status: 400 })
  }

  const buf = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    webhookLogger.error('Webhook signature verification failed', err, {
      signature: sig.substring(0, 20) + '...',
    })
    return new NextResponse(`Webhook signature verification failed: ${err.message}`, {
      status: 400,
    })
  }

  const logger = webhookLogger.child({
    eventId: event.id,
    eventType: event.type,
  })

  logger.info('Webhook received', {
    created: new Date(event.created * 1000).toISOString(),
  })

  try {
    switch (event.type) {
      // ✅ Paiement réussi (synchrone)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, event.id)
        break
      }

      // ✅ Paiement asynchrone réussi (SEPA, Bancontact, etc.)
      // 🔥 FIX: Traiter comme un SUCCÈS, pas un échec !
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionAsyncPaymentSucceeded(session, event.id)
        break
      }

      // ❌ Paiement asynchrone échoué
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionAsyncPaymentFailed(session, event.id)
        break
      }

      // ⏱️ Session expirée (24h)
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionExpired(session, event.id)
        break
      }

      // 💳 Charge réussie (pour récupérer l'URL du reçu)
      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeSucceeded(charge, event.id)
        break
      }

      // 💰 Remboursement
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(charge, event.id)
        break
      }

      // ❌ Paiement échoué
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentFailed(paymentIntent, event.id)
        break
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type })
        break
    }

    logger.info('Webhook processed successfully')
    return NextResponse.json({ received: true })
  } catch (e: any) {
    logger.error('Webhook handler error', e, {
      message: e?.message,
      stack: e?.stack,
    })
    return NextResponse.json(
      { error: 'Webhook processing failed', details: e?.message },
      { status: 500 }
    )
  }
}