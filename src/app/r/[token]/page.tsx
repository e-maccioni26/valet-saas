'use client'

import { use, useEffect, useState } from 'react'

export default function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  // ✅ Correction : "use" pour déstructurer la promesse
  const { token } = use(params)

  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<number | null>(15)
  const [at, setAt] = useState<string>('') // heure exacte
  const [comment, setComment] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tickets/by-token/${token}`)
      const data = await res.json()
      setTicket(data.ticket)
      setLoading(false)
    })()
  }, [token])

async function sendRequest(type: 'pickup' | 'keys' | 'other') {
  if (!ticket) {
    alert("Le ticket n'est pas encore chargé, veuillez patienter.")
    return
  }

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

  if (!res.ok) return alert('Erreur lors de la demande')
  alert('✅ Votre demande a bien été envoyée aux voituriers')
}

  if (loading) return <div className="p-8">Chargement...</div>
  if (!ticket) return <div className="p-8 text-red-500">Ticket introuvable.</div>

  return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">Ticket #{ticket.short_code}</h1>
      <p className="text-gray-600 mb-6">Souhaitez-vous récupérer votre véhicule ?</p>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-center gap-2">
          <label className="text-sm w-36 text-right">Dans (minutes) :</label>
          <input
            type="number"
            className="border rounded p-2 w-24 text-center"
            value={eta ?? ''}
            onChange={(e) => setEta(Number(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-center gap-2">
          <label className="text-sm w-36 text-right">Ou à (heure) :</label>
          <input
            type="time"
            className="border rounded p-2 w-36"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </div>

        <textarea
          className="border rounded p-2 w-full"
          placeholder="Message au voiturier (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

    <div className="grid grid-cols-3 gap-2">
        <button
            disabled={!ticket}
            onClick={() => sendRequest('pickup')}
            className={`py-2 rounded ${
            ticket ? 'bg-black text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
        >
            Récupérer
        </button>
        <button
            disabled={!ticket}
            onClick={() => sendRequest('keys')}
            className={`py-2 rounded ${
            ticket ? 'border' : 'border border-gray-300 text-gray-400 cursor-not-allowed'
            }`}
        >
            Clés
        </button>
        <button
            disabled={!ticket}
            onClick={() => sendRequest('other')}
            className={`py-2 rounded ${
            ticket ? 'border' : 'border border-gray-300 text-gray-400 cursor-not-allowed'
            }`}
        >
            Autre
        </button>
    </div>

    </div>
  )
}
