'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Request = {
  id: string
  type: 'pickup' | 'keys' | 'other'
  comment: string | null
  created_at: string
  ticket_id: string
  ticket?: { short_code: string }
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<Request[]>([])

  // 🔹 Charger toutes les demandes au démarrage
  useEffect(() => {
    const loadRequests = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, ticket:tickets(short_code)')
        .order('created_at', { ascending: false })

      if (error) console.error('Erreur chargement requests:', error)
      else setRequests(data || [])
    }

    loadRequests()

    // 🔹 Écouter en temps réel les nouvelles demandes
    const channel = supabase
      .channel('realtime-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        async (payload) => {
          console.log('🆕 Nouvelle demande reçue:', payload.new)
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('short_code')
            .eq('id', payload.new.ticket_id)
            .single()

          const newReq = {
            ...payload.new,
            ticket: ticketData,
          } as Request

          setRequests((prev) => [newReq, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">📋 Dashboard Voiturier</h1>

      {requests.length === 0 && (
        <p className="text-gray-500">Aucune demande pour le moment.</p>
      )}

      <div className="space-y-4">
        {requests.map((r) => (
          <div
            key={r.id}
            className="border rounded-lg p-4 shadow-sm flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold">
                Ticket #{r.ticket?.short_code || '—'}
              </h2>
              <p className="text-sm text-gray-600">
                Type :{' '}
                {r.type === 'pickup'
                  ? '🚗 Récupération véhicule'
                  : r.type === 'keys'
                  ? '🔑 Clés'
                  : '💬 Autre'}
              </p>
              {r.comment && (
                <p className="text-sm text-gray-700 mt-1 italic">
                  “{r.comment}”
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {new Date(r.created_at).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
