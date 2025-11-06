'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  DollarSign,
  TrendingUp,
  Car,
  Users,
  Loader2,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventStats {
  event_id: string
  event_name: string
  total_valets: number
  total_requests: number
  handled_requests: number
  total_service_revenue: number
  total_tips: number
  total_revenue: number
  total_vehicles: number
}

interface ValetPerformance {
  valet_id: string
  first_name: string | null
  last_name: string | null
  total_requests: number
  handled_requests: number
  total_tips: number
  total_revenue: number
  completion_rate: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AnalyticsPage() {
  const { profile, loading: profileLoading, isManager, isAdmin } = useUserProfile()
  const { toast } = useToast()
  const [eventStats, setEventStats] = useState<EventStats[]>([])
  const [valetPerformance, setValetPerformance] = useState<ValetPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  useEffect(() => {
    if (profile && (isManager || isAdmin)) {
      loadAnalytics()
    }
  }, [profile, isManager, isAdmin, selectedEventId])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Récupérer les statistiques des événements
      const managerEvents = profile?.events.map((e) => e.event_id) || []

      if (managerEvents.length === 0) {
        setEventStats([])
        setValetPerformance([])
        setLoading(false)
        return
      }

      // Statistiques des événements
      const { data: eventsData, error: eventsError } = await supabase
        .from('event_stats')
        .select('*')
        .in('event_id', managerEvents)

      if (eventsError) throw eventsError

      setEventStats(eventsData || [])

      // Statistiques des voituriers
      let valetQuery = supabase.from('valet_stats').select('*')

      if (selectedEventId) {
        valetQuery = valetQuery.eq('event_id', selectedEventId)
      } else if (managerEvents.length > 0) {
        valetQuery = valetQuery.in('event_id', managerEvents)
      }

      const { data: valetsData, error: valetsError } = await valetQuery

      if (valetsError) throw valetsError

      setValetPerformance(valetsData || [])
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible de charger les analytics',
      })
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isManager && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">
          Vous n&apos;avez pas accès à cette page
        </p>
      </div>
    )
  }

  // Calculer les totaux
  const totalRevenue = eventStats.reduce((sum, e) => sum + e.total_revenue, 0)
  const totalTips = eventStats.reduce((sum, e) => sum + e.total_tips, 0)
  const totalVehicles = eventStats.reduce((sum, e) => sum + e.total_vehicles, 0)
  const totalValets = eventStats.reduce((sum, e) => sum + e.total_valets, 0)

  // Données pour les graphiques
  const revenueByEventData = eventStats.map((e) => ({
    name: e.event_name,
    'Recettes service': e.total_service_revenue,
    'Pourboires': e.total_tips,
  }))

  const valetPerformanceData = valetPerformance.map((v) => ({
    name: `${v.first_name || ''} ${v.last_name || ''}`.trim() || 'Inconnu',
    'Demandes traitées': v.handled_requests,
    'Pourboires': v.total_tips,
    'Taux de complétion': v.completion_rate,
  }))

  const vehiclesByEventData = eventStats.map((e) => ({
    name: e.event_name,
    value: e.total_vehicles,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Statistiques et performances de votre équipe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Tous les événements</option>
            {profile?.events.map((event) => (
              <option key={event.event_id} value={event.event_id}>
                {event.event_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">
              Dont {totalTips.toFixed(2)} € de pourboires
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pourboires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTips.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">
              {((totalTips / totalRevenue) * 100 || 0).toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Véhicules gérés</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              Tous événements confondus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voituriers actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValets}</div>
            <p className="text-xs text-muted-foreground">
              Dans vos événements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus par événement</CardTitle>
            <CardDescription>
              Répartition des recettes de service et pourboires
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByEventData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune donnée disponible
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByEventData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Recettes service" fill="#8884d8" />
                  <Bar dataKey="Pourboires" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Véhicules par événement</CardTitle>
            <CardDescription>
              Nombre de véhicules gérés par événement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehiclesByEventData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune donnée disponible
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehiclesByEventData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vehiclesByEventData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance des voituriers</CardTitle>
          <CardDescription>
            Demandes traitées et pourboires par voiturier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valetPerformanceData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={valetPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="Demandes traitées" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="Pourboires" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tableau des événements */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par événement</CardTitle>
          <CardDescription>
            Vue d&apos;ensemble de tous vos événements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun événement
            </p>
          ) : (
            <div className="space-y-4">
              {eventStats.map((event) => (
                <div key={event.event_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{event.event_name}</h3>
                    </div>
                    <Badge variant="secondary">{event.total_valets} voituriers</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Véhicules</p>
                      <p className="font-medium">{event.total_vehicles}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Demandes</p>
                      <p className="font-medium">
                        {event.handled_requests}/{event.total_requests}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenus</p>
                      <p className="font-medium">{event.total_revenue.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pourboires</p>
                      <p className="font-medium">{event.total_tips.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
