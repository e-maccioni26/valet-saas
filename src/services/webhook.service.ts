/**
 * Service de gestion des webhooks Stripe
 * Traite les événements Stripe de manière sécurisée et idempotente
 * @module services/webhook
 */

import type Stripe from 'stripe'
import { supabaseServerAdmin } from '@/app/lib/supabaseServer'
import { webhookLogger } from '@/lib/logger'
import {
  updatePaymentStatus,
  getReceiptUrl,
  mapStripePaymentMethod,
} from './payment.service'
import type { PaymentStatus } from '@/types/payment'

/**
 * Vérifie si un webhook a déjà été traité (idempotence)
 */
async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await supabaseServerAdmin
    .from('payments')
    .select('id')
    .eq('last_webhook_event', eventId)
    .maybeSingle()

  if (error) {
    webhookLogger.warn('Error checking webhook idempotency', { error, eventId })
  }

  return !!data
}

/**
 * Traite l'événement checkout.session.completed
 * Déclenché quand un paiement est réussi (synchrone ou asynchrone)
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    sessionId: session.id,
    paymentIntent: session.payment_intent,
  })

  logger.info('Processing checkout.session.completed')

  const paymentId = session.metadata?.supabase_payment_id
  if (!paymentId) {
    logger.warn('No payment ID in session metadata')
    return
  }

  // Vérification de l'idempotence
  if (await isWebhookProcessed(eventId)) {
    logger.info('Webhook already processed (idempotency check)')
    return
  }

  const paymentIntentId = session.payment_intent?.toString() || null

  // Récupération de l'URL du reçu et de la méthode de paiement
  let receiptUrl: string | null = null
  let paymentMethod: string | null = null

  if (paymentIntentId) {
    try {
      receiptUrl = await getReceiptUrl(paymentIntentId)

      // Récupération de la méthode de paiement
      const { data: paymentIntentData } = await supabaseServerAdmin
        .from('payments')
        .select('stripe_payment_intent_id')
        .eq('id', paymentId)
        .maybeSingle()

      if (paymentIntentData) {
        // On pourrait récupérer plus de détails via l'API Stripe ici
        paymentMethod = session.payment_method_types?.[0] || null
      }
    } catch (error) {
      logger.error('Failed to get receipt URL or payment method', error)
    }
  }

  // Mise à jour du paiement
  await updatePaymentStatus(paymentId, 'succeeded', {
    stripe_payment_intent_id: paymentIntentId,
    stripe_receipt_url: receiptUrl,
    payment_method: mapStripePaymentMethod(paymentMethod) as any,
    last_webhook_event: eventId,
    paid_at: new Date().toISOString(),
  })

  logger.info('Payment marked as succeeded', {
    paymentId,
    receiptUrl,
    paymentMethod,
  })
}

/**
 * Traite l'événement checkout.session.async_payment_succeeded
 * Déclenché quand un paiement asynchrone (SEPA, Bancontact, etc.) réussit
 * 🔥 BUG FIX: Cet événement était précédemment traité comme un échec !
 */
export async function handleCheckoutSessionAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    sessionId: session.id,
  })

  logger.info('Processing checkout.session.async_payment_succeeded')

  const paymentId = session.metadata?.supabase_payment_id
  if (!paymentId) {
    logger.warn('No payment ID in session metadata')
    return
  }

  // Vérification de l'idempotence
  if (await isWebhookProcessed(eventId)) {
    logger.info('Webhook already processed (idempotency check)')
    return
  }

  const paymentIntentId = session.payment_intent?.toString() || null
  let receiptUrl: string | null = null

  if (paymentIntentId) {
    try {
      receiptUrl = await getReceiptUrl(paymentIntentId)
    } catch (error) {
      logger.error('Failed to get receipt URL', error)
    }
  }

  // 🔥 FIX: Marquer comme SUCCEEDED et non comme FAILED !
  await updatePaymentStatus(paymentId, 'succeeded', {
    stripe_payment_intent_id: paymentIntentId,
    stripe_receipt_url: receiptUrl,
    last_webhook_event: eventId,
    paid_at: new Date().toISOString(),
    metadata: { async_payment: true } as any,
  })

  logger.info('Async payment marked as succeeded', {
    paymentId,
    receiptUrl,
  })
}

/**
 * Traite l'événement checkout.session.async_payment_failed
 * Déclenché quand un paiement asynchrone échoue
 */
export async function handleCheckoutSessionAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    sessionId: session.id,
  })

  logger.info('Processing checkout.session.async_payment_failed')

  const paymentId = session.metadata?.supabase_payment_id
  if (!paymentId) {
    logger.warn('No payment ID in session metadata')
    return
  }

  // Vérification de l'idempotence
  if (await isWebhookProcessed(eventId)) {
    logger.info('Webhook already processed (idempotency check)')
    return
  }

  await updatePaymentStatus(paymentId, 'failed', {
    last_webhook_event: eventId,
    notes: 'Async payment failed' as any,
  })

  logger.info('Payment marked as failed (async payment)', { paymentId })
}

/**
 * Traite l'événement checkout.session.expired
 * Déclenché quand une session de paiement expire (après 24h)
 */
export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    sessionId: session.id,
  })

  logger.info('Processing checkout.session.expired')

  const paymentId = session.metadata?.supabase_payment_id
  if (!paymentId) {
    logger.warn('No payment ID in session metadata')
    return
  }

  // Vérification de l'idempotence
  if (await isWebhookProcessed(eventId)) {
    logger.info('Webhook already processed (idempotency check)')
    return
  }

  await updatePaymentStatus(paymentId, 'canceled', {
    last_webhook_event: eventId,
    notes: 'Session expired' as any,
  })

  logger.info('Payment marked as canceled (session expired)', { paymentId })
}

/**
 * Traite l'événement charge.succeeded
 * Permet de récupérer l'URL du reçu de manière plus fiable
 */
export async function handleChargeSucceeded(
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    chargeId: charge.id,
  })

  logger.info('Processing charge.succeeded')

  const paymentIntentId = charge.payment_intent?.toString()
  if (!paymentIntentId) {
    logger.warn('No payment intent ID in charge')
    return
  }

  // Recherche du paiement par payment_intent_id
  const { data: payment, error } = await supabaseServerAdmin
    .from('payments')
    .select('id, payment_status, stripe_receipt_url')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error || !payment) {
    logger.warn('Payment not found for charge', { paymentIntentId })
    return
  }

  // Mise à jour de l'URL du reçu si elle n'existe pas encore
  if (!payment.stripe_receipt_url && charge.receipt_url) {
    await supabaseServerAdmin
      .from('payments')
      .update({ stripe_receipt_url: charge.receipt_url })
      .eq('id', payment.id)

    logger.info('Receipt URL updated from charge', {
      paymentId: payment.id,
      receiptUrl: charge.receipt_url,
    })
  }
}

/**
 * Traite l'événement charge.refunded
 * Déclenché lors d'un remboursement
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    chargeId: charge.id,
  })

  logger.info('Processing charge.refunded')

  const paymentIntentId = charge.payment_intent?.toString()
  if (!paymentIntentId) {
    logger.warn('No payment intent ID in charge')
    return
  }

  // Recherche du paiement
  const { data: payment, error } = await supabaseServerAdmin
    .from('payments')
    .select('id, total_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error || !payment) {
    logger.warn('Payment not found for refund', { paymentIntentId })
    return
  }

  const refundedAmount = charge.amount_refunded / 100
  const totalAmount = payment.total_amount
  const isPartialRefund = refundedAmount < totalAmount

  const status: PaymentStatus = isPartialRefund ? 'partially_refunded' : 'refunded'

  await updatePaymentStatus(payment.id, status, {
    refunded_at: new Date().toISOString() as any,
    refund_amount: refundedAmount as any,
    last_webhook_event: eventId,
  })

  logger.info('Payment refund recorded', {
    paymentId: payment.id,
    refundedAmount,
    isPartialRefund,
  })
}

/**
 * Traite l'événement payment_intent.payment_failed
 * Déclenché lors de l'échec d'un paiement
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
): Promise<void> {
  const logger = webhookLogger.child({
    eventId,
    paymentIntentId: paymentIntent.id,
  })

  logger.info('Processing payment_intent.payment_failed')

  // Recherche du paiement
  const { data: payment, error } = await supabaseServerAdmin
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle()

  if (error || !payment) {
    logger.warn('Payment not found for failed payment intent')
    return
  }

  // Vérification de l'idempotence
  if (await isWebhookProcessed(eventId)) {
    logger.info('Webhook already processed (idempotency check)')
    return
  }

  const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed'

  await updatePaymentStatus(payment.id, 'failed', {
    last_webhook_event: eventId,
    notes: failureMessage as any,
  })

  logger.info('Payment marked as failed', {
    paymentId: payment.id,
    reason: failureMessage,
  })
}
