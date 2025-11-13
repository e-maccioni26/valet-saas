import { NextResponse } from 'next/server'
import { createPublicPayment } from '@/services/payment.service'
import { paymentLogger } from '@/lib/logger'
import type { CreatePublicPaymentPayload } from '@/types/payment'

/**
 * POST /api/payments/public
 * Crée une session de paiement Stripe pour un utilisateur invité (public)
 * Authentification par token de ticket
 */
export async function POST(req: Request) {
  const logger = paymentLogger.child({ endpoint: '/api/payments/public' })

  try {
    // Parse et validation du body
    const body = (await req.json()) as CreatePublicPaymentPayload

    if (!body?.token) {
      logger.warn('Missing token in request')
      return NextResponse.json(
        { error: 'Missing required field: token' },
        { status: 400 }
      )
    }

    if (typeof body.serviceAmount !== 'number') {
      logger.warn('Invalid serviceAmount', { serviceAmount: body.serviceAmount })
      return NextResponse.json(
        { error: 'Invalid serviceAmount. Must be a number (in cents)' },
        { status: 400 }
      )
    }

    logger.info('Creating public payment', { token: body.token })

    // Délégation au service
    const result = await createPublicPayment(body)

    logger.info('Public payment created successfully', { sessionId: result.sessionId })

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
    })
  } catch (e: any) {
    logger.error('Failed to create public payment', e)

    // Messages d'erreur plus explicites
    if (e.message?.includes('Invalid ticket token')) {
      return NextResponse.json(
        { error: 'Invalid token', details: 'The provided ticket token is invalid or expired' },
        { status: 404 }
      )
    }

    if (e.message?.includes('Database insert failed')) {
      return NextResponse.json(
        { error: 'Database error', details: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Server error',
        details: process.env.NODE_ENV === 'development' ? e.message : 'An error occurred',
      },
      { status: 500 }
    )
  }
}