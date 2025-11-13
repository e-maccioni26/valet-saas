'use client'

import { useState, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Vérification que la clé Stripe est définie
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripePublishableKey) {
  console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables')
}

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type Props =
  | {
      mode: 'public'
      token: string
      serviceAmountCents: number
      tipAmountCents?: number
      className?: string
    }
  | {
      mode: 'private'
      eventId: string
      requestId: string
      serviceAmountCents: number
      tipAmountCents?: number
      className?: string
    }

interface PaymentErrorResponse {
  error: string
  details?: string
}

export default function PayButton(props: Props) {
  const [loading, setLoading] = useState(false)
  const total = useMemo(
    () => (props.serviceAmountCents + (props.tipAmountCents ?? 0)) / 100,
    [props]
  )

  /**
   * Gère les erreurs de paiement avec des messages utilisateur clairs
   */
  function handlePaymentError(data: PaymentErrorResponse, statusCode: number) {
    let userMessage = 'Une erreur est survenue lors de la création du paiement.'

    // Messages d'erreur personnalisés selon le type d'erreur
    if (statusCode === 401) {
      userMessage = 'Vous devez être connecté pour effectuer un paiement.'
    } else if (statusCode === 403) {
      userMessage = "Vous n'êtes pas autorisé à effectuer ce paiement."
    } else if (statusCode === 404) {
      userMessage = 'Le ticket demandé est introuvable ou invalide.'
    } else if (data.details) {
      userMessage = data.details
    }

    toast.error('Erreur de paiement', {
      description: userMessage,
      duration: 5000,
    })
  }

  async function onPay() {
    try {
      setLoading(true)

      // Vérification du chargement de Stripe
      const stripe = await stripePromise
      if (!stripe) {
        toast.error('Erreur technique', {
          description: 'Impossible de charger le module de paiement. Veuillez réessayer.',
        })
        setLoading(false)
        return
      }

      // Préparation de la requête selon le mode
      let res: Response
      if (props.mode === 'public') {
        res = await fetch('/api/payments/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: props.token,
            serviceAmount: props.serviceAmountCents,
            tipAmount: props.tipAmountCents ?? 0,
          }),
        })
      } else {
        res = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: props.eventId,
            requestId: props.requestId,
            serviceAmount: props.serviceAmountCents,
            tipAmount: props.tipAmountCents ?? 0,
          }),
        })
      }

      const data = await res.json()

      // Gestion des erreurs
      if (!res.ok || !data?.url) {
        console.error('Create session failed', {
          status: res.status,
          statusText: res.statusText,
          data,
        })
        handlePaymentError(data, res.status)
        setLoading(false)
        return
      }

      // Redirection vers Stripe Checkout
      toast.success('Redirection vers le paiement...', {
        duration: 2000,
      })
      window.location.href = data.url
    } catch (e) {
      console.error('Payment error:', e)
      toast.error('Erreur de paiement', {
        description:
          'Une erreur réseau est survenue. Vérifiez votre connexion et réessayez.',
        duration: 5000,
      })
      setLoading(false)
    }
  }

  return (
    <Button onClick={onPay} disabled={loading} className={(props as any).className}>
      {loading ? 'Redirection…' : `Payer ${total.toFixed(2)} €`}
    </Button>
  )
}