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

  // Charger le ticket initial
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

  // Écouter les updates en temps réel
  useEffect(() => {
    if (!ticket?.id) return

    const channel = supabase
      .channel('requests-realtime-client')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests' },
        (payload) => {
          const updated = payload.new as any
          if (updated.ticket_id === ticket.id && updated.handled_at) {
            console.log('🔔 Demande traitée en temps réel:', updated)
            setStatus('handled')
            triggerFeedback()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket])

  // Fonction de vibration + son
  const triggerFeedback = () => {
    // Vibration mobile
    if (navigator.vibrate) navigator.vibrate([80, 50, 80])

    // Petit son de notification
    const audio = new Audio(
      'https://cdn.pixabay.com/audio/2022/03/15/audio_ae1b1b14b1.mp3'
    )
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

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Chargement...</div>
  if (!ticket) return <div className="h-screen flex items-center justify-center text-red-500">Ticket introuvable</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center px-6 py-10">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 border border-gray-200 animate-fadeIn">
        <h1 className="text-2xl font-bold text-center mb-2">🎟️ Ticket #{ticket.short_code}</h1>
        <p className="text-gray-500 text-center mb-6">Souhaitez-vous récupérer votre véhicule ?</p>

        {/* Statut dynamique */}
        <div className="mb-6 text-center">
          {status === 'idle' && (
            <div className="text-gray-500 font-medium">🕓 En attente de votre demande</div>
          )}
          {status === 'pending' && (
            <div className="text-blue-600 font-medium animate-pulse">📨 Demande envoyée, un voiturier va bientôt la traiter...</div>
          )}
          {status === 'handled' && (
            <div className="text-green-600 font-semibold animate-fadeIn">✅ Votre demande a été traitée — le voiturier arrive 🚗</div>
          )}
          {status === 'error' && (
            <div className="text-red-600 font-medium">⚠️ Erreur de traitement</div>
          )}
        </div>

        <div className="space-y-3 mb-4">
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

        {/* Boutons */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            disabled={status === 'pending'}
            onClick={() => sendRequest('pickup')}
            className={`py-2 rounded-lg font-medium transition ${
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
            className={`py-2 rounded-lg border font-medium transition ${
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
            className={`py-2 rounded-lg border font-medium transition ${
              status === 'pending'
                ? 'border-gray-300 text-gray-400'
                : 'border-black text-black hover:bg-black hover:text-white'
            }`}
          >
            Autre
          </button>
        </div>
      </div>
    </div>
  )
}