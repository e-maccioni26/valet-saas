'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { AddVehicleDialog } from '@/components/Addvehicledialog'
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
  Filter,
  MapPin,
  Palette,
  UserCheck
} from 'lucide-react'

type ReqType = 'pickup' | 'keys' | 'other'

type Vehicle = {
  brand: string | null
  model: string | null
  color: string | null
  license_plate: string | null
  parking_location: string | null
  vehicle_condition: string | null
  notes: string | null
}

type RequestRow = {
  id: string
  type: ReqType
  comment: string | null
  created_at: string
  handled_at: string | null
  ticket_id: string
  assigned_valet_id: string | null
  ticket?: {
    short_code: string
    vehicle?: Vehicle
  }
  pickup_eta_minutes: number | null
  pickup_at: string | null
}

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [fading, setFading] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isManager, setIsManager] = useState(false)
  const { toast } = useToast()

  const [typeFilter, setTypeFilter] = useState<'all' | ReqType>('all')
  const [statusFilter, setStatusFilter] = useState<'open' | 'handled' | 'mine' | 'all'>('mine')
  const [query, setQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'1h' | 'today' | 'all'>('today')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Charger les demandes
  const loadRequests = useCallback(async () => {
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast({
        type: 'error',
        title: 'Non authentifié',
        description: 'Veuillez vous connecter'
      })
      return
    }

    const userId = session.user.id
    setCurrentUserId(userId)

const { data: roleData, error: roleError } = await supabase
  .from('safe_user_roles')
  .select('role_name')
  .eq('user_id', userId)
  .maybeSingle()

if (roleError) {
  console.error('Erreur de récupération du rôle:', roleError)
}

const userIsManager = roleData?.role_name === 'manager' || roleData?.role_name === 'admin'
    setIsManager(userIsManager)

    // Construire la requête selon le rôle
    let requestsQuery = supabase
      .from('requests')
      .select(`
        *,
        ticket:tickets(
          short_code,
          event_id,
          vehicle:vehicles(
            brand,
            model,
            color,
            license_plate,
            parking_location,
            vehicle_condition,
            notes
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Si c'est un valet, filtrer par assignation ou événements
    if (!userIsManager) {
      // Récupérer les événements du voiturier
      const { data: userEvents } = await supabase
        .from('user_events')
        .select('event_id')
        .eq('user_id', userId)

      const eventIds = userEvents?.map(e => e.event_id) || []

      if (eventIds.length > 0) {
        // On ne peut pas faire de filtre complexe directement, on va filtrer côté client
        // Récupérer toutes les demandes et filtrer ensuite
        const { data, error } = await requestsQuery

        if (error) {
          console.error('Erreur de chargement des requêtes:', error)
          toast({
            type: 'error',
            title: 'Erreur',
            description: 'Impossible de charger les demandes'
          })
          return
        }

        // Filtrer : assignées au valet OU pour ses événements
        const filteredData = (data || []).filter(r => 
          r.assigned_valet_id === userId ||
          (r.ticket && eventIds.includes(r.ticket.event_id))
        )

        setRequests(filteredData as any)
        return
      }
    }

    // Manager ou valet sans événements
    const { data, error } = await requestsQuery

    if (error) {
      console.error('Erreur de chargement des requêtes:', error)
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les demandes'
      })
      return
    }

    setRequests(data as any)
  }, [toast])

  // Effet principal
  useEffect(() => {
    loadRequests()

    // Canal Realtime
    const ch = supabase
      .channel('requests-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async (payload) => {
        const newReq = payload.new as RequestRow

        // Recharger pour avoir les données complètes
        loadRequests()

        const { data: ticket } = await supabase
          .from('tickets')
          .select('short_code')
          .eq('id', newReq.ticket_id)
          .single()

        toast({
          type: 'info',
          title: `Nouvelle demande – Ticket #${ticket?.short_code ?? '—'}`,
          description:
            newReq.type === 'pickup'
              ? '🚗 Récupération véhicule'
              : newReq.type === 'keys'
              ? '🔑 Clés'
              : '💬 Autre',
        })

        audioRef.current?.play().catch(() => {})
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
        const updated = payload.new as RequestRow
        setRequests(prev =>
          prev.map(r => (r.id === updated.id ? { ...r, handled_at: updated.handled_at } : r))
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [loadRequests])

  // Marquer comme traité
  async function markHandled(id: string) {
    try {
      setFading(prev => [...prev, id])
      await new Promise(r => setTimeout(r, 200))

      const res = await fetch(`/api/requests/${id}/handle`, { method: 'POST' })
      if (!res.ok) throw new Error('Impossible de marquer la demande comme traitée.')

      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, handled_at: new Date().toISOString() } : r))
      )

      toast({ type: 'success', title: '✅ Demande traitée', description: 'La demande a été marquée comme traitée.' })
    } catch (err: any) {
      toast({ type: 'error', title: 'Erreur', description: err.message || 'Une erreur est survenue.' })
    } finally {
      setFading(prev => prev.filter(x => x !== id))
    }
  }

  // Prendre en charge une demande
  async function assignToMe(requestId: string) {
    if (!currentUserId) return

    try {
      const { error } = await supabase
        .from('requests')
        .update({ assigned_valet_id: currentUserId })
        .eq('id', requestId)

      if (error) throw error

      // Recharger les demandes
      loadRequests()

      toast({ 
        type: 'success', 
        title: '✅ Demande assignée', 
        description: 'Vous êtes maintenant en charge de cette demande.' 
      })
    } catch (err: any) {
      toast({ 
        type: 'error', 
        title: 'Erreur', 
        description: err.message || 'Impossible d\'assigner la demande.' 
      })
    }
  }

  // Filtres
  const filtered = useMemo(() => {
    const now = new Date()
    const from =
      timeFilter === '1h'
        ? new Date(now.getTime() - 60 * 60 * 1000)
        : timeFilter === 'today'
        ? new Date(new Date().toDateString())
        : null
        
    return requests.filter(r => {
      // Filtre par type
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      
      // Filtre par statut
      if (statusFilter !== 'all') {
        const open = !r.handled_at
        const mine = r.assigned_valet_id === currentUserId
        
        if (statusFilter === 'open' && !open) return false
        if (statusFilter === 'handled' && open) return false
        if (statusFilter === 'mine' && !mine) return false
      }
      
      // Filtre par temps
      if (from && new Date(r.created_at) < from) return false
      
      // Filtre par recherche
      if (query) {
        const q = query.toLowerCase()
        const sc = r.ticket?.short_code?.toLowerCase() ?? ''
        const c = r.comment?.toLowerCase() ?? ''
        const plate = r.ticket?.vehicle?.license_plate?.toLowerCase() ?? ''
        if (!sc.includes(q) && !c.includes(q) && !plate.includes(q)) return false
      }
      
      return true
    })
  }, [requests, typeFilter, statusFilter, query, timeFilter, currentUserId])

  // Stats
  const stats = useMemo(() => {
    const today = new Date(new Date().toDateString())
    const todayReqs = requests.filter(r => new Date(r.created_at) >= today)
    const myReqs = requests.filter(r => r.assigned_valet_id === currentUserId)
    const myOpen = myReqs.filter(r => !r.handled_at)
    const pickupsToday = todayReqs.filter(r => r.type === 'pickup').length
    
    const avgEta = (() => {
      const vals = requests.map(r => r.pickup_eta_minutes).filter((v): v is number => typeof v === 'number')
      if (!vals.length) return '—'
      const m = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      return `${m} min`
    })()
    
    return { 
      today: todayReqs.length, 
      myOpen: myOpen.length,
      myTotal: myReqs.length,
      pickupsToday, 
      avgEta 
    }
  }, [requests, currentUserId])

  // Fonctions auxiliaires
  const getTypeIcon = (type: ReqType) => {
    switch (type) {
      case 'pickup': return <Car className="h-4 w-4" />
      case 'keys': return <Key className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: ReqType) => {
    switch (type) {
      case 'pickup': return 'Récupération'
      case 'keys': return 'Clés'
      default: return 'Autre'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAA==" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Gérez vos demandes de voiturier en temps réel
          </p>
        </div>
        <AddVehicleDialog onVehicleAdded={loadRequests} />
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
            <CardTitle className="text-sm font-medium">Mes demandes</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myOpen}</div>
            <p className="text-xs text-muted-foreground">
              En attente / {stats.myTotal} total
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
          {/* Filtres de type */}
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

          {/* Filtres de statut */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('mine')}
            >
              Mes demandes
            </Button>
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

          {/* Filtres de temps */}
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

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ticket, plaque ou commentaire..."
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
            const vehicle = r.ticket?.vehicle
            const isMine = r.assigned_valet_id === currentUserId
            const isUnassigned = !r.assigned_valet_id

            return (
              <Card
                key={r.id}
                className={`transition-all duration-300 ${
                  isFading ? 'opacity-50 scale-[0.98]' : 'opacity-100'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
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
                        {isMine && (
                          <Badge variant="default">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Ma demande
                          </Badge>
                        )}
                        {isUnassigned && (
                          <Badge variant="outline" className="border-orange-500 text-orange-700">
                            Non assignée
                          </Badge>
                        )}
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

                      {/* Informations véhicule */}
                      {vehicle && (vehicle.brand || vehicle.model || vehicle.color || vehicle.license_plate) && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border space-y-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Car className="h-4 w-4" />
                            Informations véhicule
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {(vehicle.brand || vehicle.model) && (
                              <div>
                                <span className="text-muted-foreground">Véhicule:</span>{' '}
                                <span className="font-medium">
                                  {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                                </span>
                              </div>
                            )}
                            {vehicle.color && (
                              <div className="flex items-center gap-1">
                                <Palette className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{vehicle.color}</span>
                              </div>
                            )}
                            {vehicle.license_plate && (
                              <div>
                                <span className="text-muted-foreground">Plaque:</span>{' '}
                                <span className="font-mono font-bold">{vehicle.license_plate}</span>
                              </div>
                            )}
                            {vehicle.parking_location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{vehicle.parking_location}</span>
                              </div>
                            )}
                          </div>
                          {vehicle.vehicle_condition && (
                            <div className="text-xs text-orange-700 mt-2">
                              <strong>⚠️ État:</strong> {vehicle.vehicle_condition}
                            </div>
                          )}
                          {vehicle.notes && (
                            <div className="text-xs text-slate-600 mt-1">
                              <strong>📝 Notes:</strong> {vehicle.notes}
                            </div>
                          )}
                        </div>
                      )}

                      {r.comment && (
                        <CardDescription className="italic mt-2">
                          &ldquo;{r.comment}&rdquo;
                        </CardDescription>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {isOpen ? (
                      <>
                        {isMine ? (
                          <Button onClick={() => markHandled(r.id)} className="w-full sm:w-auto">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Marquer comme traité
                          </Button>
                        ) : isUnassigned ? (
                          <Button onClick={() => assignToMe(r.id)} variant="outline" className="w-full sm:w-auto">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Prendre en charge
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Assignée à un autre voiturier
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Traité à {new Date(r.handled_at!).toLocaleTimeString('fr-FR')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}