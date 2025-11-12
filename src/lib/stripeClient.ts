// src/lib/stripeClient.ts
'use client'
import { loadStripe } from '@stripe/stripe-js'

export const getStripe = (() => {
  let stripePromise: Promise<import('@stripe/stripe-js').Stripe | null>
  return () => {
    if (!stripePromise) {
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      stripePromise = loadStripe(pk)
    }
    return stripePromise
  }
})()