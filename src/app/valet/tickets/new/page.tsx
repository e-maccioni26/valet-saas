'use client'

import { useState, useEffect } from 'react'
import { ulid } from 'ulid'
import { createSupabaseClient } from '@/app/lib/supabaseClient'

const supabase = createSupabaseClient()

export default function NewTicketPage() {
  const [shortCode, setShortCode] = useState('')
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [ticketUrl, setTicketUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase.from('events').select('id, name')
      if (error) console.error('Erreur chargement events:', error)
      else setEvents(data || [])
    }
    loadEvents()
  }, [])

  async function handleRegister() {
    if (!shortCode || !eventId) {
      alert('Veuillez entrer un code et choisir un événement.')
      return
    }

    setLoading(true)
    const token = ulid()

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortCode, token, eventId }),
    })

    const result = await res.json()
    setLoading(false)

    if (!res.ok) {
      alert('Erreur : ' + (result.error || 'inconnue'))
      return
    }

    const url = `${window.location.origin}/r/${token}`
    setTicketUrl(url)

    alert('🎫 Ticket enregistré avec succès !')
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white shadow p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🎟️ Enregistrer un ticket existant</h2>

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Numéro du ticket imprimé
      </label>
      <input
        type="text"
        value={shortCode}
        onChange={(e) => setShortCode(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="Ex: 0008"
      />

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Événement associé
      </label>
      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      >
        <option value="">Sélectionnez un événement</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
      </select>

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer le ticket'}
      </button>

      {ticketUrl && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-1">Lien client (pour test) :</p>
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all"
          >
            {ticketUrl}
          </a>
        </div>
      )}
    </div>
  )
}