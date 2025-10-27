'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Badge from '@/components/Badge'
import Toast from '@/components/Toast'
import StatCard from '@/components/StatCard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ReqType = 'pickup' | 'keys' | 'other'

type RequestRow = {
  id: string
  type: ReqType
  comment: string | null
  created_at: string
  handled_at: string | null
  ticket_id: string
  ticket?: { short_code: string }
  pickup_eta_minutes: number | null
  pickup_at: string | null
}

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [fading, setFading] = useState<string[]>([]) // ids animées

  // filtres
  const [typeFilter, setTypeFilter] = useState<'all' | ReqType>('all')
  const [statusFilter, setStatusFilter] = useState<'open' | 'handled' | 'all'>('open')
  const [query, setQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'1h' | 'today' | 'all'>('today')

  // Toast + bip
  const [toast, setToast] = useState<{ open: boolean; title: string; desc?: string }>({
    open: false,
    title: '',
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // charge initial
    const load = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, ticket:tickets(short_code)')
        .order('created_at', { ascending: false })
      if (!error && data) setRequests(data as any)
    }
    load()

    // realtime
    const ch = supabase
      .channel('requests-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        async (payload) => {
          const { data: t } = await supabase
            .from('tickets')
            .select('short_code')
            .eq('id', (payload.new as any).ticket_id)
            .single()
          const newReq: RequestRow = { ...(payload.new as any), ticket: t || undefined }
          setRequests((prev) => [newReq, ...prev])

          setToast({
            open: true,
            title: `Nouvelle demande – Ticket #${t?.short_code ?? '—'}`,
            desc:
              newReq.type === 'pickup'
                ? 'Récupération véhicule'
                : newReq.type === 'keys'
                ? 'Clés'
                : 'Autre',
          })
          if (audioRef.current) audioRef.current.play().catch(() => {})
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  // marquer comme traité avec animation
  async function markHandled(id: string) {
    setFading((prev) => [...prev, id])
    await new Promise((r) => setTimeout(r, 250))
    const res = await fetch(`/api/requests/${id}/handle`, { method: 'POST' })
    if (!res.ok) return alert('Erreur: impossible de marquer comme traité')
    setRequests((prev) => prev.filter((r) => r.id !== id))
    setToast({ open: true, title: '✅ Demande traitée avec succès' })
    setFading((prev) => prev.filter((x) => x !== id))
  }

  // filtres dynamiques
  const filtered = useMemo(() => {
    const now = new Date()
    const from =
      timeFilter === '1h'
        ? new Date(now.getTime() - 60 * 60 * 1000)
        : timeFilter === 'today'
        ? new Date(new Date().toDateString())
        : null
    return requests.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (statusFilter !== 'all') {
        const open = !r.handled_at
        if (statusFilter === 'open' && !open) return false
        if (statusFilter === 'handled' && open) return false
      }
      if (from && new Date(r.created_at) < from) return false
      if (query) {
        const q = query.toLowerCase()
        const sc = r.ticket?.short_code?.toLowerCase() ?? ''
        const c = r.comment?.toLowerCase() ?? ''
        if (!sc.includes(q) && !c.includes(q)) return false
      }
      return true
    })
  }, [requests, typeFilter, statusFilter, query, timeFilter])

  // stats
  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString())
    const todayReqs = requests.filter((r) => new Date(r.created_at) >= today)
    const open = requests.filter((r) => !r.handled_at)
    const pickupsToday = todayReqs.filter((r) => r.type === 'pickup').length
    const avgEta = (() => {
      const vals = requests
        .map((r) => r.pickup_eta_minutes)
        .filter((v): v is number => typeof v === 'number')
      if (!vals.length) return '-'
      const m = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      return `${m} min`
    })()
    return { today: todayReqs.length, open: open.length, pickupsToday, avgEta }
  }, [requests])

  return (
    <div className="p-6 space-y-6">
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAA=="
      />
      <h1 className="text-2xl font-bold">📋 Dashboard Voiturier</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Demandes aujourd'hui" value={stats.today} />
        <StatCard label="Ouvertes" value={stats.open} />
        <StatCard label="Récupérations aujourd'hui" value={stats.pickupsToday} />
        <StatCard label="ETA moyen" value={stats.avgEta} />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 text-sm ${
              typeFilter === 'all' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setTypeFilter('pickup')}
            className={`px-3 py-1 text-sm ${
              typeFilter === 'pickup' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Récup
          </button>
          <button
            onClick={() => setTypeFilter('keys')}
            className={`px-3 py-1 text-sm ${
              typeFilter === 'keys' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Clés
          </button>
          <button
            onClick={() => setTypeFilter('other')}
            className={`px-3 py-1 text-sm ${
              typeFilter === 'other' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Autre
          </button>
        </div>

        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1 text-sm ${
              statusFilter === 'open' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Ouvertes
          </button>
          <button
            onClick={() => setStatusFilter('handled')}
            className={`px-3 py-1 text-sm ${
              statusFilter === 'handled' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Traitées
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-sm ${
              statusFilter === 'all' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Toutes
          </button>
        </div>

        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setTimeFilter('1h')}
            className={`px-3 py-1 text-sm ${
              timeFilter === '1h' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Dernière heure
          </button>
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1 text-sm ${
              timeFilter === 'today' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1 text-sm ${
              timeFilter === 'all' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Tout
          </button>
        </div>

        <input
          placeholder="Recherche (#0007, note...)"
          className="border rounded px-3 py-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Liste */}
      <div className="space-y-3 mt-4">
        {filtered.map((r) => {
          const isOpen = !r.handled_at
          const tone =
            r.type === 'pickup' ? 'red' : r.type === 'keys' ? 'yellow' : 'blue'
          const isFading = fading.includes(r.id)

          return (
            <div
              key={r.id}
              className={`transition-all duration-300 ease-in-out transform ${
                isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100'
              } rounded-xl border p-4 bg-white shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">
                    Ticket #{r.ticket?.short_code ?? '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tone as any}>
                      {r.type === 'pickup'
                        ? '🚗 Récupération'
                        : r.type === 'keys'
                        ? '🔑 Clés'
                        : '💬 Autre'}
                    </Badge>
                    {isOpen ? (
                      <Badge tone="red">Ouverte</Badge>
                    ) : (
                      <Badge tone="green">Traité</Badge>
                    )}
                    {r.pickup_eta_minutes ? (
                      <Badge tone="gray">
                        ETA {r.pickup_eta_minutes} min
                      </Badge>
                    ) : null}
                    {r.pickup_at ? (
                      <Badge tone="gray">
                        Heure {new Date(r.pickup_at).toLocaleTimeString()}
                      </Badge>
                    ) : null}
                  </div>
                  {r.comment ? (
                    <div className="text-sm text-gray-700 italic mt-1">
                      “{r.comment}”
                    </div>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {isOpen && (
                  <button
                    onClick={() => markHandled(r.id)}
                    className="px-3 py-1 rounded bg-black text-white text-sm hover:bg-gray-800 transition"
                  >
                    Marquer comme traité
                  </button>
                )}
                {!isOpen && (
                  <span className="text-xs text-gray-500">
                    Traité à {new Date(r.handled_at!).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-gray-500 text-sm">
            Aucune demande selon les filtres.
          </div>
        )}
      </div>

      {/* Toast */}
      <div
        className={`fixed right-4 top-4 z-50 transform transition-all duration-500 ease-out ${
          toast.open
            ? 'translate-y-0 opacity-100'
            : '-translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-green-600 text-white rounded-lg px-4 py-2 shadow-lg">
          {toast.title}
        </div>
      </div>
    </div>
  )
}
