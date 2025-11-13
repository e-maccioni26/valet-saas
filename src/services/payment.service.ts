/**
 * Service de gestion des paiements Stripe
 * Centralise toute la logique métier des paiements
 * @module services/payment
 */

import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseServerAdmin } from '@/app/lib/supabaseServer'
import { paymentLogger } from '@/lib/logger'
import type {
  CreatePaymentPayload,
  CreatePublicPaymentPayload,
  CreateRefundPayload,
  CheckoutSessionResponse,
  Payment,
  PaymentStatus,
  PaymentMethod,
  StripeSessionMetadata,
} from '@/types/payment'
import {
  PAYMENT_LIMITS,
  clampAmount,
  isValidUuid,
} from '@/types/payment'

/**
 * Crée une session de paiement Stripe pour un utilisateur authentifié
 */
export async function createAuthenticatedPayment(
  userId: string,
  userEmail: string | undefined,
  payload: CreatePaymentPayload
): Promise<CheckoutSessionResponse> {
  const logger = paymentLogger.child({ userId, eventId: payload.eventId })
  logger.info('Creating authenticated payment', { payload })

  try {
    // Validation des montants
    const currency = (payload.currency || 'eur').toLowerCase()
    const serviceAmount = clampAmount(
      payload.serviceAmount,
      PAYMENT_LIMITS.minServiceAmount,
      PAYMENT_LIMITS.maxServiceAmount
    )
    const tipAmount = clampAmount(
      payload.tipAmount ?? 0,
      PAYMENT_LIMITS.minTipAmount,
      PAYMENT_LIMITS.maxTipAmount
    )

    logger.debug('Amounts validated', { serviceAmount, tipAmount, currency })

    // Vérification de l'appartenance à l'événement
    const { data: userEvent } = await supabaseServerAdmin
      .from('user_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', payload.eventId)
      .maybeSingle()

    if (!userEvent) {
      logger.warn('User not assigned to event', { userId, eventId: payload.eventId })
      throw new Error('User is not assigned to this event')
    }

    // Validation de la request si fournie
    let requestId: string | null = null
    if (isValidUuid(payload.requestId)) {
      const { data: request } = await supabaseServerAdmin
        .from('requests')
        .select('id')
        .eq('id', payload.requestId!)
        .maybeSingle()

      if (request?.id) {
        requestId = request.id
        logger.debug('Request validated', { requestId })
      }
    }

    // Récupération du profil utilisateur
    const { data: profile } = await supabaseServerAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    // Création du client Stripe
    const customer = await stripe.customers.create({
      email: userEmail || undefined,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
      metadata: { supabase_user_id: userId },
    })

    logger.info('Stripe customer created', { customerId: customer.id })

    // Insertion du paiement en base (statut pending)
    const { data: paymentRow, error: insertError } = await supabaseServerAdmin
      .from('payments')
      .insert({
        request_id: requestId,
        event_id: payload.eventId,
        valet_id: userId,
        currency,
        service_amount: serviceAmount / 100,
        tip_amount: tipAmount / 100,
        payment_status: 'pending',
        notes: payload.notes || null,
        metadata: { source: 'private' },
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error('Failed to insert payment in database', insertError, { payload })
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    logger.info('Payment record created', { paymentId: paymentRow.id })

    // Création de la session Stripe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await createStripeCheckoutSession({
      customerId: customer.id,
      serviceAmount,
      tipAmount,
      currency,
      eventId: payload.eventId,
      requestId,
      paymentId: paymentRow.id,
      userId,
      successUrl: `${baseUrl}/valet/payments?success=1`,
      cancelUrl: `${baseUrl}/valet/payments?canceled=1`,
    })

    // Mise à jour avec les IDs Stripe
    await supabaseServerAdmin
      .from('payments')
      .update({
        stripe_session_id: session.id,
        stripe_customer_id: customer.id,
      })
      .eq('id', paymentRow.id)

    logger.info('Stripe session created', {
      sessionId: session.id,
      paymentId: paymentRow.id,
    })

    return {
      url: session.url!,
      sessionId: session.id,
    }
  } catch (error) {
    logger.error('Failed to create authenticated payment', error)
    throw error
  }
}

/**
 * Crée une session de paiement Stripe pour un utilisateur invité (public)
 */
export async function createPublicPayment(
  payload: CreatePublicPaymentPayload
): Promise<CheckoutSessionResponse> {
  const logger = paymentLogger.child({ token: payload.token })
  logger.info('Creating public payment', { payload })

  try {
    // Récupération du ticket
    const { data: ticket, error: ticketError } = await supabaseServerAdmin
      .from('tickets')
      .select('id, event_id, short_code')
      .eq('token', payload.token)
      .maybeSingle()

    if (ticketError || !ticket) {
      logger.warn('Invalid token provided', { token: payload.token })
      throw new Error('Invalid ticket token')
    }

    logger.debug('Ticket found', { ticketId: ticket.id, eventId: ticket.event_id })

    // Récupération de la dernière request
    const { data: request } = await supabaseServerAdmin
      .from('requests')
      .select('id, handled_at')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const requestId = request?.id || null

    // Validation des montants
    const currency = 'eur'
    const serviceAmount = clampAmount(
      payload.serviceAmount,
      PAYMENT_LIMITS.minServiceAmount,
      PAYMENT_LIMITS.maxServiceAmount
    )
    const tipAmount = clampAmount(
      payload.tipAmount ?? 0,
      PAYMENT_LIMITS.minTipAmount,
      PAYMENT_LIMITS.maxTipAmount
    )

    logger.debug('Amounts validated', { serviceAmount, tipAmount })

    // Insertion du paiement en base
    const { data: paymentRow, error: insertError } = await supabaseServerAdmin
      .from('payments')
      .insert({
        request_id: requestId,
        event_id: ticket.event_id,
        valet_id: null, // Public payment = pas de valet associé
        currency,
        service_amount: serviceAmount / 100,
        tip_amount: tipAmount / 100,
        payment_status: 'pending',
        notes: payload.notes || null,
        metadata: { source: 'public', ticket_id: ticket.id },
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error('Failed to insert payment in database', insertError)
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    logger.info('Payment record created', { paymentId: paymentRow.id })

    // Création de la session Stripe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await createStripeCheckoutSession({
      serviceAmount,
      tipAmount,
      currency,
      eventId: ticket.event_id,
      requestId,
      paymentId: paymentRow.id,
      ticketId: ticket.id,
      successUrl: `${baseUrl}/r/${payload.token}?success=1`,
      cancelUrl: `${baseUrl}/r/${payload.token}?canceled=1`,
    })

    // Mise à jour avec l'ID de session
    await supabaseServerAdmin
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', paymentRow.id)

    logger.info('Stripe session created', {
      sessionId: session.id,
      paymentId: paymentRow.id,
    })

    return {
      url: session.url!,
      sessionId: session.id,
    }
  } catch (error) {
    logger.error('Failed to create public payment', error)
    throw error
  }
}

/**
 * Crée une session Stripe Checkout
 */
async function createStripeCheckoutSession(params: {
  customerId?: string
  serviceAmount: number
  tipAmount: number
  currency: string
  eventId: string
  requestId: string | null
  paymentId: string
  ticketId?: string
  userId?: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: params.currency,
        product_data: {
          name: 'Service voiturier',
          metadata: {
            type: 'service',
            event_id: params.eventId,
            request_id: params.requestId || '',
          },
        },
        unit_amount: params.serviceAmount,
      },
    },
  ]

  // Ajout du pourboire si présent
  if (params.tipAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: params.currency,
        product_data: {
          name: 'Pourboire',
          metadata: { type: 'tip' },
        },
        unit_amount: params.tipAmount,
      },
    })
  }

  // Métadonnées de la session
  const metadata: StripeSessionMetadata = {
    supabase_payment_id: params.paymentId,
    event_id: params.eventId,
    request_id: params.requestId || '',
  }

  if (params.ticketId) {
    metadata.ticket_id = params.ticketId
  }

  if (params.userId) {
    metadata.supabase_user_id = params.userId
  }

  // Création de la session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    invoice_creation: { enabled: true },
    metadata,
    // Options de paiement
    payment_method_types: ['card', 'link'],
    // Expire après 24 heures
    expires_at: Math.floor(Date.now() / 1000) + 86400,
  }

  if (params.customerId) {
    sessionParams.customer = params.customerId
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

/**
 * Met à jour le statut d'un paiement
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  updates: Partial<Payment> = {}
): Promise<void> {
  const logger = paymentLogger.child({ paymentId, status })
  logger.info('Updating payment status', { updates })

  const updateData: any = {
    payment_status: status,
    ...updates,
  }

  // Ajout automatique de paid_at si le paiement réussit
  if (status === 'succeeded' && !updates.paid_at) {
    updateData.paid_at = new Date().toISOString()
  }

  const { error } = await supabaseServerAdmin
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)

  if (error) {
    logger.error('Failed to update payment status', error)
    throw new Error(`Failed to update payment: ${error.message}`)
  }

  logger.info('Payment status updated successfully')
}

/**
 * Récupère les détails d'un Payment Intent Stripe
 */
export async function getPaymentIntentDetails(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  })
}

/**
 * Crée un remboursement pour un paiement
 */
export async function createRefund(
  payload: CreateRefundPayload
): Promise<Stripe.Refund> {
  const logger = paymentLogger.child({ paymentId: payload.paymentId })
  logger.info('Creating refund', { payload })

  try {
    // Récupération du paiement
    const { data: payment, error } = await supabaseServerAdmin
      .from('payments')
      .select('*')
      .eq('id', payload.paymentId)
      .single()

    if (error || !payment) {
      logger.error('Payment not found', error)
      throw new Error('Payment not found')
    }

    if (payment.payment_status !== 'succeeded') {
      logger.warn('Cannot refund non-succeeded payment', { status: payment.payment_status })
      throw new Error('Can only refund succeeded payments')
    }

    if (!payment.stripe_payment_intent_id) {
      logger.error('No payment intent ID found')
      throw new Error('No Stripe payment intent found')
    }

    // Création du remboursement Stripe
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripe_payment_intent_id,
      reason: payload.reason,
      metadata: {
        supabase_payment_id: payment.id,
        notes: payload.notes || '',
      },
    }

    if (payload.amount) {
      refundParams.amount = payload.amount
    }

    const refund = await stripe.refunds.create(refundParams)

    logger.info('Stripe refund created', { refundId: refund.id })

    // Mise à jour du paiement en base
    const isPartialRefund = payload.amount && payload.amount < payment.total_amount * 100
    await supabaseServerAdmin
      .from('payments')
      .update({
        payment_status: isPartialRefund ? 'partially_refunded' : 'refunded',
        refunded_at: new Date().toISOString(),
        refund_amount: (payload.amount || payment.total_amount * 100) / 100,
        refund_reason: payload.reason || 'requested_by_customer',
        metadata: {
          ...payment.metadata,
          refund_id: refund.id,
          refund_notes: payload.notes,
        },
      })
      .eq('id', payment.id)

    logger.info('Payment refund recorded in database')

    return refund
  } catch (error) {
    logger.error('Failed to create refund', error)
    throw error
  }
}

/**
 * Récupère l'URL du reçu depuis un Payment Intent
 */
export async function getReceiptUrl(paymentIntentId: string): Promise<string | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    })

    const charge = paymentIntent.latest_charge as Stripe.Charge | null
    return charge?.receipt_url || null
  } catch (error) {
    paymentLogger.error('Failed to get receipt URL', error, { paymentIntentId })
    return null
  }
}

/**
 * Convertit une méthode de paiement Stripe en notre type
 */
export function mapStripePaymentMethod(
  paymentMethod: string | null | undefined
): PaymentMethod {
  if (!paymentMethod) return 'other'

  const methodMap: Record<string, PaymentMethod> = {
    card: 'card',
    sepa_debit: 'sepa_debit',
    link: 'link',
  }

  return methodMap[paymentMethod] || 'other'
}
