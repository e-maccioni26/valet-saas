/**
 * Types partagés pour le module de paiement Stripe
 * @module types/payment
 */

import type Stripe from 'stripe'

/**
 * Statuts possibles d'un paiement
 */
export type PaymentStatus =
  | 'pending'           // En attente de paiement
  | 'processing'        // Paiement en cours de traitement
  | 'succeeded'         // Paiement réussi
  | 'failed'            // Paiement échoué
  | 'canceled'          // Paiement annulé
  | 'refunded'          // Paiement remboursé
  | 'partially_refunded' // Paiement partiellement remboursé

/**
 * Méthodes de paiement supportées
 */
export type PaymentMethod =
  | 'card'              // Carte bancaire
  | 'sepa_debit'        // Prélèvement SEPA
  | 'link'              // Stripe Link
  | 'other'             // Autre méthode

/**
 * Payload pour créer un paiement (route privée)
 */
export interface CreatePaymentPayload {
  requestId?: string | null
  eventId: string
  currency?: string
  serviceAmount: number  // en centimes
  tipAmount?: number     // en centimes
  notes?: string
}

/**
 * Payload pour créer un paiement public (route publique)
 */
export interface CreatePublicPaymentPayload {
  token: string
  serviceAmount: number  // en centimes
  tipAmount?: number     // en centimes
  notes?: string
}

/**
 * Payload pour créer un remboursement
 */
export interface CreateRefundPayload {
  paymentId: string
  amount?: number        // en centimes (optionnel, remboursement total si omis)
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  notes?: string
}

/**
 * Réponse de création de session Stripe
 */
export interface CheckoutSessionResponse {
  url: string
  sessionId: string
}

/**
 * Erreur de paiement structurée
 */
export interface PaymentError {
  code: string
  message: string
  details?: any
}

/**
 * Données d'un paiement depuis la DB
 */
export interface Payment {
  id: string
  request_id: string | null
  event_id: string
  valet_id: string | null
  currency: string
  service_amount: number
  tip_amount: number
  total_amount: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  stripe_customer_id: string | null
  stripe_receipt_url: string | null
  metadata: Record<string, any>
  last_webhook_event: string | null
  notes: string | null
  paid_at: string | null
  created_at: string
  refunded_at?: string | null
  refund_amount?: number | null
  refund_reason?: string | null
}

/**
 * Métadonnées Stripe pour une session de paiement
 */
export interface StripeSessionMetadata {
  supabase_payment_id: string
  event_id: string
  request_id?: string
  ticket_id?: string
  supabase_user_id?: string
}

/**
 * Résultat d'un traitement de webhook
 */
export interface WebhookProcessingResult {
  success: boolean
  paymentId?: string
  status?: PaymentStatus
  error?: string
}

/**
 * Configuration des limites de montants
 */
export interface PaymentLimits {
  minServiceAmount: number  // centimes
  maxServiceAmount: number  // centimes
  minTipAmount: number      // centimes
  maxTipAmount: number      // centimes
}

/**
 * Constantes de limites de paiement
 */
export const PAYMENT_LIMITS: PaymentLimits = {
  minServiceAmount: 100,      // 1€
  maxServiceAmount: 100_000,  // 1000€
  minTipAmount: 0,            // 0€
  maxTipAmount: 50_000,       // 500€
} as const

/**
 * Valide et normalise un montant de paiement
 */
export function clampAmount(amount: number, min: number, max: number): number {
  const value = Math.floor(Number(amount) || 0)
  return Math.max(min, Math.min(value, max))
}

/**
 * Valide un UUID v4
 */
export function isValidUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Formatte un montant en centimes vers une chaîne affichable
 */
export function formatCurrency(amountInCents: number, currency: string = 'EUR'): string {
  const amount = amountInCents / 100
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}
