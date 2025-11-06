'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Loader2,
  Star,
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react'

interface TeamMember {
  valet_id: string
  email: string
  first_name: string | null
  last_name: string | null
  event_id: string | null
  event_name: string | null
  total_requests: number
  handled_requests: number
  total_tips: number
  total_service: number
  total_revenue: number
  completion_rate: number
  avg_handling_time_minutes: number | null
}

export default function TeamPage() {
  const { profile, loading: profileLoading, isManager, isAdmin } = useUserProfile()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  useEffect(() => {
    if (profile && (isManager || isAdmin)) {
      loadTeamMembers()
    }
  }, [profile, isManager, isAdmin, selectedEventId])

  const loadTeamMembers = async () => {
    setLoading(true)
    try {
      const managerEvents = profile?.events.map((e) => e.event_id) || []

      if (managerEvents.length === 0) {
        setTeamMembers([])
        setLoading(false)
        return
      }

      let query = supabase.from('valet_stats').select('*')

      if (selectedEventId) {
        query = query.eq('event_id', selectedEventId)
      } else {
        query = query.in('event_id', managerEvents)
      }

      const { data, error } = await query

      if (error) throw error

      setTeamMembers(data || [])
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible de charger l\'équipe',
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) return 'U'
    return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase()
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return { label: 'Excellent', variant: 'default' as const }
    if (rate >= 70) return { label: 'Bon', variant: 'secondary' as const }
    return { label: 'À améliorer', variant: 'destructive' as const }
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

  // Calculer les statistiques globales
  const totalMembers = new Set(teamMembers.map((m) => m.valet_id)).size
  const totalRequests = teamMembers.reduce((sum, m) => sum + m.total_requests, 0)
  const totalHandled = teamMembers.reduce((sum, m) => sum + m.handled_requests, 0)
  const totalRevenue = teamMembers.reduce((sum, m) => sum + m.total_revenue, 0)
  const avgCompletionRate = teamMembers.length > 0
    ? teamMembers.reduce((sum, m) => sum + m.completion_rate, 0) / teamMembers.length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Équipe</h1>
          <p className="text-muted-foreground">
            Gérez et suivez les performances de votre équipe
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membres</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Voituriers actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes traitées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalHandled}/{totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRequests > 0 ? ((totalHandled / totalRequests) * 100).toFixed(1) : 0}% de taux de complétion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus générés</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Tous membres confondus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance moyenne</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(avgCompletionRate)}`}>
              {avgCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Taux de complétion</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des membres */}
      <Card>
        <CardHeader>
          <CardTitle>Membres de l&apos;équipe</CardTitle>
          <CardDescription>
            Vue détaillée des performances de chaque membre
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun membre dans l&apos;équipe</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grouper par valet_id pour éviter les doublons si un valet est sur plusieurs événements */}
              {Object.values(
                teamMembers.reduce((acc, member) => {
                  if (!acc[member.valet_id]) {
                    acc[member.valet_id] = {
                      ...member,
                      events: [{ event_id: member.event_id, event_name: member.event_name }],
                    }
                  } else {
                    if (member.event_id && member.event_name) {
                      acc[member.valet_id].events.push({
                        event_id: member.event_id,
                        event_name: member.event_name,
                      })
                    }
                    acc[member.valet_id].total_requests += member.total_requests
                    acc[member.valet_id].handled_requests += member.handled_requests
                    acc[member.valet_id].total_tips += member.total_tips
                    acc[member.valet_id].total_revenue += member.total_revenue
                  }
                  return acc
                }, {} as Record<string, any>)
              ).map((member: any) => {
                const performance = getPerformanceBadge(member.completion_rate)

                return (
                  <Card key={member.valet_id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {member.first_name} {member.last_name}
                              </h3>
                              <Badge variant={performance.variant}>
                                <Star className="mr-1 h-3 w-3" />
                                {performance.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>

                            {member.events && member.events.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {member.events.map((event: any, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {event.event_name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getPerformanceColor(member.completion_rate)}`}>
                            {member.completion_rate.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Complétion</p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Demandes traitées
                          </p>
                          <p className="text-sm font-medium">
                            {member.handled_requests}/{member.total_requests}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Revenus
                          </p>
                          <p className="text-sm font-medium">{member.total_revenue.toFixed(2)} €</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Pourboires
                          </p>
                          <p className="text-sm font-medium">{member.total_tips.toFixed(2)} €</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Service
                          </p>
                          <p className="text-sm font-medium">{member.total_service.toFixed(2)} €</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Temps moyen
                          </p>
                          <p className="text-sm font-medium">
                            {member.avg_handling_time_minutes
                              ? `${member.avg_handling_time_minutes.toFixed(1)} min`
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
