'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<number | null>(15)
  const [at, setAt] = useState<string>('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'handled' | 'error'>('idle')

  // Charger le ticket
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

 // Écoute les updates côté client
useEffect(() => {
  if (!ticket?.id) return

  const channel = supabase
    .channel('requests-realtime-client')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      (payload) => {
        const updated = payload.new as any

        // ✅ détecte update handled_at
        if (updated.ticket_id === ticket.id && updated.handled_at) {
          console.log('🟢 Demande traitée détectée:', updated)
          setStatus('handled')
          triggerFeedback()
        }

        // ✅ détecte création initiale
        if (updated.ticket_id === ticket.id && payload.eventType === 'INSERT') {
          console.log('📨 Nouvelle demande envoyée')
          setStatus('pending')
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [ticket])

  // Feedback : vibration + son
  const triggerFeedback = () => {
    if (navigator.vibrate) navigator.vibrate([100, 60, 100])
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_ae1b1b14b1.mp3')
    audio.play().catch(() => {})
  }

  // Envoyer la demande
  async function sendRequest(type: 'pickup' | 'keys' | 'other') {
    if (!ticket) return alert('Ticket non chargé.')
    setStatus('pending')

    const payload: any = {
      type,
      ticketId: ticket.id,
      pickup_eta_minutes: eta ?? null,
      pickup_at: at
        ? new Date(`${new Date().toDateString()} ${at}:00`).toISOString()
        : null,
      comment: comment || null,
    }

    const res = await fetch('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setStatus('error')
      return alert('❌ Erreur lors de la demande')
    }

    setStatus('pending')
  }

  if (loading)
    return <div className="h-screen flex items-center justify-center text-gray-500">Chargement...</div>
  if (!ticket)
    return <div className="h-screen flex items-center justify-center text-red-500">Ticket introuvable</div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Barre supérieure sticky */}
      <header
        className={`sticky top-0 z-20 w-full text-white text-center py-3 font-semibold transition-all ${
          status === 'handled'
            ? 'bg-green-600 animate-fadeIn'
            : status === 'pending'
            ? 'bg-blue-600 animate-pulse'
            : 'bg-gray-800'
        }`}
      >
        {status === 'handled'
          ? '✅ Votre voiturier arrive 🚘'
          : status === 'pending'
          ? '📨 Demande en cours de traitement...'
          : '🅿️ Service voiturier'}
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col justify-between px-6 py-8 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-center mb-2">
            Ticket #{ticket.short_code}
          </h1>
          <p className="text-gray-500 text-center mb-6">
            Indiquez quand vous souhaitez récupérer votre véhicule
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-600">Dans (minutes)</label>
              <input
                type="number"
                className="border rounded-lg p-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-black"
                value={eta ?? ''}
                onChange={(e) => setEta(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-600">Ou à (heure)</label>
              <input
                type="time"
                className="border rounded-lg p-2 w-36 focus:outline-none focus:ring-2 focus:ring-black"
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </div>

            <textarea
              className="border rounded-lg p-2 w-full h-24 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Message au voiturier (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Statut visuel */}
          <div className="mb-6 text-center">
            {status === 'idle' && (
              <div className="text-gray-500 font-medium">🕓 En attente de votre demande</div>
            )}
            {status === 'pending' && (
              <div className="text-blue-600 font-medium animate-pulse">
                🧑‍🔧 Le voiturier prépare votre véhicule...
              </div>
            )}
            {status === 'handled' && (
              <div className="text-green-600 font-semibold animate-fadeIn">
                ✅ Votre demande a été traitée — le voiturier arrive 🚗
              </div>
            )}
            {status === 'error' && (
              <div className="text-red-600 font-medium">⚠️ Une erreur est survenue</div>
            )}
          </div>
        </div>

        {/* Boutons fixes bas */}
        <div className="grid grid-cols-3 gap-3 mt-auto mb-4">
          <button
            disabled={status === 'pending'}
            onClick={() => sendRequest('pickup')}
            className={`py-3 rounded-lg font-medium transition text-sm ${
              status === 'pending'
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            Récupérer
          </button>
          <button
            disabled={status === 'pending'}
            onClick={() => sendRequest('keys')}
            className={`py-3 rounded-lg border font-medium text-sm transition ${
              status === 'pending'
                ? 'border-gray-300 text-gray-400'
                : 'border-black text-black hover:bg-black hover:text-white'
            }`}
          >
            Clés
          </button>
          <button
            disabled={status === 'pending'}
            onClick={() => sendRequest('other')}
            className={`py-3 rounded-lg border font-medium text-sm transition ${
              status === 'pending'
                ? 'border-gray-300 text-gray-400'
                : 'border-black text-black hover:bg-black hover:text-white'
            }`}
          >
            Autre
          </button>
        </div>
      </main>
    </div>
  )
}