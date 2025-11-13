import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createRefund } from '@/services/payment.service'
import { paymentLogger } from '@/lib/logger'
import type { CreateRefundPayload } from '@/types/payment'

/**
 * POST /api/payments/refund
 * Crée un remboursement Stripe pour un paiement existant
 * Réservé aux admins et managers
 */
export async function POST(req: Request) {
  const logger = paymentLogger.child({ endpoint: '/api/payments/refund' })

  try {
    // Parse et validation du body
    const body = (await req.json()) as CreateRefundPayload

    if (!body?.paymentId) {
      logger.warn('Missing paymentId in request')
      return NextResponse.json(
        { error: 'Missing required field: paymentId' },
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
      logger.warn('Unauthorized refund attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérification du rôle (admin ou manager uniquement)
    const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id })

    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      logger.warn('Forbidden refund attempt', { userId: user.id, role: userRole })
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only admins and managers can create refunds' },
        { status: 403 }
      )
    }

    logger.info('Creating refund', { userId: user.id, paymentId: body.paymentId })

    // Création du remboursement via le service
    const refund = await createRefund(body)

    logger.info('Refund created successfully', {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    })

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        created: refund.created,
      },
    })
  } catch (e: any) {
    logger.error('Failed to create refund', e)

    // Messages d'erreur plus explicites
    if (e.message?.includes('Payment not found')) {
      return NextResponse.json(
        { error: 'Not found', details: 'Payment not found' },
        { status: 404 }
      )
    }

    if (e.message?.includes('Can only refund succeeded payments')) {
      return NextResponse.json(
        { error: 'Invalid operation', details: 'Can only refund succeeded payments' },
        { status: 400 }
      )
    }

    if (e.message?.includes('No Stripe payment intent found')) {
      return NextResponse.json(
        { error: 'Invalid payment', details: 'Payment has no associated Stripe transaction' },
        { status: 400 }
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
