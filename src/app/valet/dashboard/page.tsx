'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '../../../hooks/use-toast'
import { 
  Car, 
  Key, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Search,
  Calendar,
  TrendingUp,
  Users,
  Filter
} from 'lucide-react'

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
  const [fading, setFading] = useState<string[]>([])
  const { toast } = useToast()

  // Filtres
  const [typeFilter, setTypeFilter] = useState<'all' | ReqType>('all')
  const [statusFilter, setStatusFilter] = useState<'open' | 'handled' | 'all'>('open')
  const [query, setQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'1h' | 'today' | 'all'>('today')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, ticket:tickets(short_code)')
        .order('created_at', { ascending: false })
      if (!error && data) setRequests(data as any)
    }
    load()

    const ch = supabase
      .channel('requests-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        async (payload) => {
          const newReq = payload.new as any

          if (payload.eventType === 'INSERT') {
            const { data: t } = await supabase
              .from('tickets')
              .select('short_code')
              .eq('id', newReq.ticket_id)
              .single()
            setRequests((prev) => [{ ...newReq, ticket: t || undefined }, ...prev])

            toast({
              title: `Nouvelle demande – Ticket #${t?.short_code ?? '—'}`,
              description:
                newReq.type === 'pickup'
                  ? '🚗 Récupération véhicule'
                  : newReq.type === 'keys'
                  ? '🔑 Clés'
                  : '💬 Autre',
            })
            if (audioRef.current) audioRef.current.play().catch(() => {})
          }

          if (payload.eventType === 'UPDATE' && newReq.handled_at) {
            setRequests((prev) =>
              prev.map((r) =>
                r.id === newReq.id ? { ...r, handled_at: newReq.handled_at } : r
              )
            )
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [toast])

  async function markHandled(id: string) {
    try {
      setFading((prev) => [...prev, id])
      await new Promise((r) => setTimeout(r, 200))

      const res = await fetch(`/api/requests/${id}/handle`, { method: 'POST' })
      if (!res.ok) {
        toast({
          title: '❌ Erreur',
          description: 'Impossible de marquer la demande comme traitée.',
          variant: 'destructive',
        })
        setFading((prev) => prev.filter((x) => x !== id))
        return
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, handled_at: new Date().toISOString() } : r
        )
      )

      toast({
        title: '✅ Demande traitée',
        description: 'La demande a été marquée comme traitée.',
      })

      setFading((prev) => prev.filter((x) => x !== id))
    } catch (err) {
      console.error(err)
      toast({
        title: '⚠️ Erreur inattendue',
        description: String(err),
        variant: 'destructive',
      })
    }
  }

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

  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString())
    const todayReqs = requests.filter((r) => new Date(r.created_at) >= today)
    const open = requests.filter((r) => !r.handled_at)
    const pickupsToday = todayReqs.filter((r) => r.type === 'pickup').length
    const avgEta = (() => {
      const vals = requests
        .map((r) => r.pickup_eta_minutes)
        .filter((v): v is number => typeof v === 'number')
      if (!vals.length) return '—'
      const m = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      return `${m} min`
    })()
    return { today: todayReqs.length, open: open.length, pickupsToday, avgEta }
  }, [requests])

  const getTypeIcon = (type: ReqType) => {
    switch (type) {
      case 'pickup':
        return <Car className="h-4 w-4" />
      case 'keys':
        return <Key className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: ReqType) => {
    switch (type) {
      case 'pickup':
        return 'Récupération'
      case 'keys':
        return 'Clés'
      default:
        return 'Autre'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAA==" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Gérez vos demandes de voiturier en temps réel
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aujourd&apos;hui</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">
              Demandes reçues aujourd&apos;hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ouvertes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">
              Demandes en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Récupérations</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pickupsToday}</div>
            <p className="text-xs text-muted-foreground">
              Véhicules récupérés aujourd&apos;hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ETA moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEta}</div>
            <p className="text-xs text-muted-foreground">
              Temps moyen de récupération
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              Tous
            </Button>
            <Button
              variant={typeFilter === 'pickup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('pickup')}
            >
              <Car className="mr-2 h-4 w-4" />
              Récupération
            </Button>
            <Button
              variant={typeFilter === 'keys' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('keys')}
            >
              <Key className="mr-2 h-4 w-4" />
              Clés
            </Button>
            <Button
              variant={typeFilter === 'other' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('other')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Autre
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('open')}
            >
              Ouvertes
            </Button>
            <Button
              variant={statusFilter === 'handled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('handled')}
            >
              Traitées
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Toutes
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={timeFilter === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('1h')}
            >
              Dernière heure
            </Button>
            <Button
              variant={timeFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('today')}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant={timeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('all')}
            >
              Tout
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ticket ou commentaire..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune demande selon les filtres.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => {
            const isOpen = !r.handled_at
            const isFading = fading.includes(r.id)

            return (
              <Card
                key={r.id}
                className={`transition-all duration-300 ${
                  isFading ? 'opacity-50 scale-[0.98]' : 'opacity-100'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">
                        Ticket #{r.ticket?.short_code ?? '—'}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isOpen ? 'destructive' : 'secondary'}>
                          {isOpen ? (
                            <>
                              <Clock className="mr-1 h-3 w-3" />
                              Ouverte
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Traitée
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {getTypeIcon(r.type)}
                          {getTypeLabel(r.type)}
                        </Badge>
                        {r.pickup_eta_minutes && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {r.pickup_eta_minutes} min
                          </Badge>
                        )}
                        {r.pickup_at && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(r.pickup_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                  {r.comment && (
                    <CardDescription className="italic mt-2">
                      &ldquo;{r.comment}&rdquo;
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {isOpen ? (
                    <Button onClick={() => markHandled(r.id)} className="w-full sm:w-auto">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marquer comme traité
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Traité à {new Date(r.handled_at!).toLocaleTimeString('fr-FR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}