'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'
import {
  User,
  Mail,
  Shield,
  Users,
  Calendar,
  Trash2,
  UserPlus,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TeamMember {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  roles: Array<{
    role_name: string
  }>
  events: Array<{
    event_id: string
    event_name: string
  }>
}

interface Event {
  id: string
  name: string
}

export default function ProfilePage() {
  const { profile, loading: profileLoading, isManager, isAdmin } = useUserProfile()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')

  useEffect(() => {
    if (profile && (isManager || isAdmin)) {
      loadTeamMembers()
      loadEvents()
    }
  }, [profile, isManager, isAdmin])

  const loadEvents = async () => {
    try {
      // Récupérer tous les événements
      const { data, error } = await supabase.from('events').select('id, name')

      if (error) throw error

      setEvents(data || [])
    } catch (err: any) {
      console.error('Erreur lors du chargement des événements:', err)
    }
  }

  const loadTeamMembers = async () => {
    if (!profile) return

    setLoadingTeam(true)
    try {
      // Récupérer les événements du manager
      const managerEvents = profile.events.map((e) => e.event_id)

      if (managerEvents.length === 0) {
        setTeamMembers([])
        return
      }

      // Récupérer les utilisateurs affiliés aux mêmes événements
      const { data: userEvents, error: ueError } = await supabase
        .from('user_events')
        .select('user_id')
        .in('event_id', managerEvents)

      if (ueError) throw ueError

      const userIds = [...new Set(userEvents?.map((ue) => ue.user_id) || [])]

      if (userIds.length === 0) {
        setTeamMembers([])
        return
      }

      // Récupérer les profils complets
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds)

      if (profilesError) throw profilesError

      setTeamMembers(profiles as TeamMember[])
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible de charger les membres de l\'équipe',
      })
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleAddUserToEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUserEmail || !selectedEventId) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
      })
      return
    }

    setAddingUser(true)
    try {
      // Trouver l'utilisateur par email
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single()

      if (userError) {
        toast({
          type: 'error',
          title: 'Erreur',
          description: 'Utilisateur non trouvé',
        })
        return
      }

      // Ajouter l'utilisateur à l'événement
      const { error: insertError } = await supabase.from('user_events').insert({
        user_id: userData.id,
        event_id: selectedEventId,
        assigned_by: profile?.id,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            type: 'error',
            title: 'Erreur',
            description: 'Cet utilisateur est déjà affilié à cet événement',
          })
        } else {
          throw insertError
        }
        return
      }

      // Assigner le rôle valet s'il n'en a pas
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'valet')
        .single()

      if (roleData) {
        // Vérifier si le rôle existe déjà
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userData.id)
          .eq('role_id', roleData.id)
          .single()

        // Ajouter le rôle seulement s'il n'existe pas
        if (!existingRole) {
          await supabase.from('user_roles').insert({
            user_id: userData.id,
            role_id: roleData.id,
          })
        }
      }

      toast({
        type: 'success',
        title: 'Succès',
        description: 'Utilisateur ajouté à l\'événement',
      })

      setNewUserEmail('')
      setSelectedEventId('')
      loadTeamMembers()
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible d\'ajouter l\'utilisateur',
      })
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemoveUserFromEvent = async (userId: string, eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cet utilisateur de cet événement ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (error) throw error

      toast({
        type: 'success',
        title: 'Succès',
        description: 'Utilisateur retiré de l\'événement',
      })

      loadTeamMembers()
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Erreur',
        description: err.message || 'Impossible de retirer l\'utilisateur',
      })
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et votre équipe
        </p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">
            <User className="mr-2 h-4 w-4" />
            Informations
          </TabsTrigger>
          {(isManager || isAdmin) && (
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Gestion des voituriers
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {profile?.first_name || 'Non renseigné'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nom</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {profile?.last_name || 'Non renseigné'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {profile?.email}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rôles</Label>
                <div className="flex flex-wrap gap-2">
                  {profile?.roles && profile.roles.length > 0 ? (
                    profile.roles.map((role, idx) => (
                      <Badge key={idx} variant="secondary">
                        <Shield className="mr-1 h-3 w-3" />
                        {role.role_name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Aucun rôle</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Événements</Label>
                <div className="flex flex-wrap gap-2">
                  {profile?.events && profile.events.length > 0 ? (
                    profile.events.map((event, idx) => (
                      <Badge key={idx} variant="outline">
                        <Calendar className="mr-1 h-3 w-3" />
                        {event.event_name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Aucun événement
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(isManager || isAdmin) && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ajouter un utilisateur</CardTitle>
                <CardDescription>
                  Affecter un utilisateur à un événement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUserToEvent} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email de l&apos;utilisateur</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="utilisateur@example.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        disabled={addingUser}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event">Événement</Label>
                      <select
                        id="event"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={addingUser}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Sélectionner un événement</option>
                        {events.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button type="submit" disabled={addingUser}>
                    {addingUser ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Ajouter l&apos;utilisateur
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Membres de l&apos;équipe</CardTitle>
                <CardDescription>
                  Utilisateurs affiliés à vos événements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun membre dans l&apos;équipe
                  </p>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.first_name} {member.last_name}
                            </p>
                            {member.roles.map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {role.role_name}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.events.map((event, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {event.event_name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.events.map((event) => (
                              <DropdownMenuItem
                                key={event.event_id}
                                onClick={() =>
                                  handleRemoveUserFromEvent(member.id, event.event_id)
                                }
                                className="text-destructive cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Retirer de {event.event_name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
