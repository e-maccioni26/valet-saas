// src/components/PayButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

type Props = {
  eventId: string
  requestId?: string
  defaultServiceAmountCents: number   // ex: 1500 = 15.00€
  currency?: string                   // 'eur' par défaut
}

export default function PayButton({
  eventId,
  requestId,
  defaultServiceAmountCents,
  currency = 'eur',
}: Props) {
  const [service, setService] = useState(defaultServiceAmountCents) // cents
  const [tip, setTip] = useState(0)                                  // cents
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const formatEur = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

  async function handlePay() {
    try {
      setLoading(true)
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          requestId,
          currency,
          serviceAmount: service,
          tipAmount: tip,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Payment init failed')
      }
      window.location.href = data.url
    } catch (e: any) {
      toast({ type: 'error', title: 'Paiement', description: e.message || 'Erreur inconnue' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Service</Label>
          <Input
            type="number"
            min={0}
            value={(service / 100).toString()}
            onChange={(e) => setService(Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)))}
          />
        </div>
        <div className="space-y-1">
          <Label>Pourboire</Label>
          <Input
            type="number"
            min={0}
            value={(tip / 100).toString()}
            onChange={(e) => setTip(Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Total</span>
        <span className="font-semibold text-foreground">
          {formatEur(service + tip)}
        </span>
      </div>

      <Button className="w-full" onClick={handlePay} disabled={loading}>
        {loading ? 'Redirection...' : `Payer ${formatEur(service + tip)}`}
      </Button>
    </div>
  )
}