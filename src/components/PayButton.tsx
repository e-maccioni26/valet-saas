'use client'

import { useState, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!)

type Props =
  | { mode: 'public'; token: string; serviceAmountCents: number; tipAmountCents?: number; className?: string }
  | { mode: 'private'; eventId: string; requestId: string; serviceAmountCents: number; tipAmountCents?: number; className?: string }

export default function PayButton(props: Props) {
  const [loading, setLoading] = useState(false)
  const total = useMemo(() => (props.serviceAmountCents + (props.tipAmountCents ?? 0)) / 100, [props])

  async function onPay() {
    try {
      setLoading(true)
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

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
        // private
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
      if (!res.ok || !data?.url) {
        console.error('Create session failed', data)
        alert('Impossible de créer le paiement.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert('Erreur de paiement.')
      setLoading(false)
    }
  }

  return (
    <Button onClick={onPay} disabled={loading} className={(props as any).className}>
      {loading ? 'Redirection…' : `Payer ${total.toFixed(2)} €`}
    </Button>
  )
}