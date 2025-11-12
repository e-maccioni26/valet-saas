'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, Key, MessageSquare, Clock, CheckCircle2, Loader2, PartyPopper, Euro } from 'lucide-react'
import PayButton from '@/components/PayButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [ticket, setTicket] = useState<any>(null)
  const [activeRequest, setActiveRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<number | null>(15)
  const [at, setAt] = useState<string>('')
  const [comment, setComment] = useState('')
  const [serviceAmount, setServiceAmount] = useState(1500) // 15€
  const [tipAmount, setTipAmount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'pending' | 'handled' | 'error'>('idle')

  // ---- 1. Charger le ticket via token ----
  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/tickets/by-token/${token}`)
      const data = await res.json()
      if (data.ticket) {
        setTicket(data.ticket)
        setStatus('idle')
      } else {
        setStatus('error')
      }
      setLoading(false)
    })()
  }, [token])

  // ---- 2. Charger la dernière request associée ----
  useEffect(() => {
    if (!ticket?.id) return
    ;(async () => {
      const res = await fetch(`/api/requests/by-ticket/${ticket.id}`)
      const data = await res.json()
      setActiveRequest(data?.request ?? null)
    })()
  }, [ticket])

  // ---- 3. Abonnement Realtime ----
  useEffect(() => {
    if (!ticket?.id) return
    const channel = supabase
      .channel('requests-realtime-client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          const updated = payload.new as any
          if (updated.ticket_id === ticket.id && updated.handled_at) {
            console.log('🟢 Demande traitée')
            setStatus('handled')
            triggerFeedback()
          }
          if (updated.ticket_id === ticket.id && payload.eventType === 'INSERT') {
            console.log('📨 Demande envoyée')
            setActiveRequest(updated)
            setStatus('pending')
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket])

  // ---- Feedback vibration + son ----
  const triggerFeedback = () => {
    if (navigator.vibrate) navigator.vibrate([100, 60, 100])
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_ae1b1b14b1.mp3')
    audio.play().catch(() => {})
  }

  // ---- 4. Envoyer une nouvelle request ----
async function sendRequest(type: 'pickup' | 'keys' | 'other') {
  if (!ticket) return alert('Ticket non chargé.')
  setStatus('pending')

  const payload = {
    token, // ✅ on envoie le token au lieu de ticketId
    type,
    pickup_eta_minutes: eta ?? null,
    pickup_at: at ? new Date(`${new Date().toDateString()} ${at}:00`).toISOString() : null,
    comment: comment || null,
  }

  const res = await fetch('/api/public/requests', { // ✅ nouvelle route publique
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    setStatus('error')
    return alert('❌ Erreur lors de la demande')
  }

  setStatus('pending')
}

  // ---- 5. UI pendant chargement ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- 6. Ticket introuvable ----
  if (!ticket || status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <MessageSquare className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Ticket introuvable</CardTitle>
            <CardDescription>
              Ce ticket n&apos;existe pas ou a expiré. Veuillez contacter le service voiturier.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // ---- 7. Statut handled (paiement Stripe) ----
  if (status === 'handled') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-md border-green-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-pulse">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Votre véhicule est prêt 🚗
            </CardTitle>
            <CardDescription className="text-base">
              Le voiturier arrive avec votre véhicule.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Car className="h-5 w-5" />
              <span>Ticket #{ticket.short_code}</span>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">
                Merci d’avoir utilisé notre service.<br />
                Vous pouvez régler le service et laisser un pourboire 👇
              </p>
            </div>

            {/* 💳 Paiement Stripe (public mode) */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  value={serviceAmount / 100}
                  onChange={(e) => setServiceAmount(Number(e.target.value) * 100)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">€ (service)</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  value={tipAmount / 100}
                  onChange={(e) => setTipAmount(Number(e.target.value) * 100)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">€ (pourboire)</span>
              </div>

              <PayButton
                mode="public"
                token={token}
                serviceAmountCents={serviceAmount}
                tipAmountCents={tipAmount}
                className="w-full"
              />
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Paiement sécurisé par Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- 8. Vue principale ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Barre supérieure */}
      <div
        className={`sticky top-0 z-20 w-full text-white text-center py-4 font-semibold transition-all shadow-md ${
          status === 'pending'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 animate-pulse'
            : 'bg-gradient-to-r from-slate-800 to-slate-900'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Car className="h-5 w-5" />
          <span>
            {status === 'pending'
              ? 'Demande en cours de traitement...'
              : 'Service Voiturier'}
          </span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container max-w-2xl mx-auto p-4 py-8 space-y-6">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-3xl">Ticket #{ticket.short_code}</CardTitle>
            <CardDescription className="text-base">
              Indiquez quand vous souhaitez récupérer votre véhicule
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Temps estimé */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eta" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Dans (minutes)
                </Label>
                <Input
                  id="eta"
                  type="number"
                  min="1"
                  max="180"
                  value={eta ?? ''}
                  onChange={(e) => setEta(Number(e.target.value))}
                  placeholder="15"
                  disabled={status === 'pending'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="at" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ou à (heure)
                </Label>
                <Input
                  id="at"
                  type="time"
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                  disabled={status === 'pending'}
                />
              </div>
            </div>

            {/* Commentaire */}
            <div className="space-y-2">
              <Label htmlFor="comment">Message au voiturier (optionnel)</Label>
              <Textarea
                id="comment"
                placeholder="Ex: Je suis au bar, venez me chercher..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={status === 'pending'}
                rows={3}
              />
            </div>

            {/* Statut */}
            {status === 'idle' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 bg-slate-50 rounded-lg">
                <Clock className="h-4 w-4" />
                En attente de votre demande
              </div>
            )}

            {status === 'pending' && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                Le voiturier prépare votre véhicule...
              </div>
            )}

            {/* Boutons d'action */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Button
                disabled={status === 'pending'}
                onClick={() => sendRequest('pickup')}
                size="lg"
                className="h-auto py-4 flex-col gap-2"
              >
                <Car className="h-5 w-5" />
                <span className="text-xs">Récupérer</span>
              </Button>

              <Button
                disabled={status === 'pending'}
                onClick={() => sendRequest('keys')}
                variant="outline"
                size="lg"
                className="h-auto py-4 flex-col gap-2"
              >
                <Key className="h-5 w-5" />
                <span className="text-xs">Clés</span>
              </Button>

              <Button
                disabled={status === 'pending'}
                onClick={() => sendRequest('other')}
                variant="outline"
                size="lg"
                className="h-auto py-4 flex-col gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Autre</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <PartyPopper className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>
                Une fois votre demande envoyée, le voiturier sera notifié et préparera votre véhicule.
                Vous recevrez une confirmation dès qu&apos;il sera prêt.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}