import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAuthenticatedPayment } from '@/services/payment.service'
import { paymentLogger } from '@/lib/logger'
import type { CreatePaymentPayload } from '@/types/payment'

/**
 * POST /api/payments/create
 * Crée une session de paiement Stripe pour un utilisateur authentifié
 */
export async function POST(req: Request) {
  const logger = paymentLogger.child({ endpoint: '/api/payments/create' })

  try {
    // Parse et validation du body
    const body = (await req.json()) as CreatePaymentPayload

    if (!body?.eventId || typeof body.serviceAmount !== 'number') {
      logger.warn('Invalid payload received', { body })
      return NextResponse.json(
        { error: 'Invalid payload. Required: eventId (string), serviceAmount (number)' },
        { status: 400 }
      )
    }

    // Authentification de l'utilisateur
    const cookieStore = await (await import('next/headers')).cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, expires: new Date(0) })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Creating authenticated payment', { userId: user.id, eventId: body.eventId })

    // Délégation au service
    const result = await createAuthenticatedPayment(user.id, user.email, body)

    logger.info('Payment created successfully', { sessionId: result.sessionId })

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
    })
  } catch (e: any) {
    logger.error('Failed to create payment', e)

    // Messages d'erreur plus explicites
    if (e.message?.includes('not assigned to this event')) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'You are not assigned to this event' },
        { status: 403 }
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