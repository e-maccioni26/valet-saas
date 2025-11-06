'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  Car,
  Clock,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ValetStats, EventStats } from '../../../types/team'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [valetStats, setValetStats] = useState<ValetStats[]>([])
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      loadAnalytics()
    }
  }, [selectedEvent])

  async function loadEvents() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('event_id, events(id, name)')
        .eq('user_id', user.id)

      const userEvents = userEventsData?.map((ue: any) => ({
        id: ue.events.id,
        name: ue.events.name,
      })) || []

      setEvents(userEvents)
      if (userEvents.length > 0) {
        setSelectedEvent(userEvents[0].id)
      }
    } catch (error: any) {
      console.error('Error loading events:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les événements',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics() {
    try {
      // Charger les statistiques des voituriers
      const { data: valetData, error: valetError } = await supabase
        .from('valet_stats')
        .select('*')
        .eq('event_id', selectedEvent)

      if (valetError) throw valetError
      setValetStats(valetData || [])

      // Charger les statistiques de l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('event_stats')
        .select('*')
        .eq('event_id', selectedEvent)
        .single()

      if (eventError) throw eventError
      setEventStats(eventData)
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        type: 'error',
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const f = firstName?.[0]?.toUpperCase() || ''
    const l = lastName?.[0]?.toUpperCase() || ''
    return f + l || 'U'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Visualisez les performances de votre équipe
          </p>
        </div>

        <div className="w-[280px]">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un événement" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {eventStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(eventStats.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Service: {formatCurrency(eventStats.total_service_revenue)} | Pourboires:{' '}
                {formatCurrency(eventStats.total_tips)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demandes</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventStats.total_requests}</div>
              <p className="text-xs text-muted-foreground">
                {eventStats.handled_requests} traitées (
                {eventStats.total_requests > 0
                  ? Math.round(
                      (eventStats.handled_requests / eventStats.total_requests) * 100
                    )
                  : 0}
                %)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voituriers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventStats.total_valets}</div>
              <p className="text-xs text-muted-foreground">
                {eventStats.total_vehicles} véhicules gérés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventStats.total_vehicles}</div>
              <p className="text-xs text-muted-foreground">Total géré</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Performance par voiturier</CardTitle>
          <CardDescription>
            Statistiques détaillées de chaque membre de l&apos;équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voiturier</TableHead>
                  <TableHead className="text-right">Demandes</TableHead>
                  <TableHead className="text-right">Taux de complétion</TableHead>
                  <TableHead className="text-right">Temps moyen</TableHead>
                  <TableHead className="text-right">Pourboires</TableHead>
                  <TableHead className="text-right">Revenu total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valetStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      <div className="py-8 text-muted-foreground">
                        Aucune donnée disponible
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  valetStats
                    .sort((a, b) => b.total_revenue - a.total_revenue)
                    .map((valet) => (
                      <TableRow key={valet.valet_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(valet.first_name, valet.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {valet.first_name} {valet.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {valet.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{valet.total_requests}</div>
                          <div className="text-sm text-muted-foreground">
                            {valet.handled_requests} traitées
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              valet.completion_rate >= 90
                                ? 'default'
                                : valet.completion_rate >= 70
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {valet.completion_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {valet.avg_handling_time_minutes
                              ? `${valet.avg_handling_time_minutes.toFixed(1)} min`
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(valet.total_tips)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(valet.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}