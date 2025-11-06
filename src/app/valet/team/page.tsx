'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Mail,
  Shield,
  Calendar,
  Search,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { UserProfile } from '../../../types/team'

interface Event {
  id: string
  name: string
}

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [currentUserEvents, setCurrentUserEvents] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  // État pour l'ajout d'utilisateur
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedRole, setSelectedRole] = useState<'valet' | 'manager'>('valet')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Charger les événements de l'utilisateur connecté
      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('event_id, events(id, name)')
        .eq('user_id', user.id)

      const userEvents = userEventsData?.map((ue: any) => ({
        id: ue.events.id,
        name: ue.events.name,
      })) || []

      setEvents(userEvents)
      setCurrentUserEvents(userEvents.map((e) => e.id))

      // Charger tous les membres de l'équipe (utilisateurs des mêmes événements)
      const eventIds = userEvents.map((e) => e.id)
      
      const { data: membersData, error } = await supabase
        .from('user_events')
        .select(`
          user_id,
          event_id,
          users:user_id (
            id,
            email
          )
        `)
        .in('event_id', eventIds)

      if (error) throw error

      // Grouper les utilisateurs uniques et charger leurs profils
      const uniqueUserIds = [...new Set(membersData?.map((m: any) => m.user_id) || [])]
      
      const profilesPromises = uniqueUserIds.map(async (userId) => {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single()
        return data
      })

      const profiles = (await Promise.all(profilesPromises)).filter(Boolean)
      setTeamMembers(profiles)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUser() {
    if (!newUserEmail || !selectedEvent) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs',
        type: 'error',
      })
      return
    }

    setAdding(true)
    try {
      // Vérifier si l'utilisateur existe
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single()

      if (userError || !userData) {
        toast({
          title: 'Utilisateur introuvable',
          description: "Cet utilisateur n'existe pas dans le système",
          type: 'error',
        })
        return
      }

      const userId = userData.id

      // Obtenir l'ID du rôle sélectionné
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', selectedRole)
        .single()

      if (!roleData) throw new Error('Rôle introuvable')

      // Ajouter le rôle à l'utilisateur
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: roleData.id,
        })

      if (roleError && roleError.code !== '23505') {
        throw roleError
      }

      // Assigner l'utilisateur à l'événement
      const { error: eventError } = await supabase
        .from('user_events')
        .insert({
          user_id: userId,
          event_id: selectedEvent,
        })

      if (eventError && eventError.code !== '23505') {
        throw eventError
      }

      toast({
        title: 'Utilisateur ajouté',
        description: "L'utilisateur a été ajouté à l'équipe avec succès",
        type: 'success',
      })

      setAddDialogOpen(false)
      setNewUserEmail('')
      setSelectedEvent('')
      setSelectedRole('valet')
      await loadData()
    } catch (error: any) {
      console.error('Error adding user:', error)
      toast({
        title: 'Erreur',
        description: "Impossible d'ajouter l'utilisateur",
        type: 'error',
      })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveUser(userId: string, eventId: string) {
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
        title: 'Utilisateur retiré',
        description: "L'utilisateur a été retiré de l'événement",
        type: 'success',
      })

      await loadData()
    } catch (error: any) {
      console.error('Error removing user:', error)
      toast({
        title: 'Erreur',
        description: "Impossible de retirer l'utilisateur",
        type: 'error',
      })
    }
  }

  const filteredMembers = teamMembers.filter((member) => {
    const query = searchQuery.toLowerCase()
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
    const email = member.email.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

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
          <h1 className="text-3xl font-bold tracking-tight">Gestion d&apos;équipe</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre équipe et leurs événements
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur à l&apos;équipe</DialogTitle>
              <DialogDescription>
                Ajoutez un utilisateur existant à votre équipe et assignez-le à un
                événement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email de l&apos;utilisateur</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="utilisateur@exemple.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;utilisateur doit déjà avoir un compte
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as 'valet' | 'manager')
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valet">Voiturier</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event">Événement</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger id="event">
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={adding}
              >
                Annuler
              </Button>
              <Button onClick={handleAddUser} disabled={adding}>
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membres de l&apos;équipe</CardTitle>
          <CardDescription>
            {filteredMembers.length} membre(s) dans votre équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôles</TableHead>
                  <TableHead>Événements</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <div className="py-8 text-muted-foreground">
                        Aucun membre trouvé
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles && member.roles.length > 0 ? (
                            member.roles.map((role: any) => (
                              <Badge key={role.role_id} variant="outline">
                                {role.role_name === 'admin'
                                  ? 'Admin'
                                  : role.role_name === 'manager'
                                  ? 'Manager'
                                  : 'Voiturier'}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Aucun rôle</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.events && member.events.length > 0 ? (
                            member.events
                              .filter((event: any) =>
                                currentUserEvents.includes(event.event_id)
                              )
                              .map((event: any) => (
                                <Badge key={event.event_id} variant="secondary">
                                  {event.event_name}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Aucun événement
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {member.events &&
                            member.events
                              .filter((event: any) =>
                                currentUserEvents.includes(event.event_id)
                              )
                              .map((event: any) => (
                                <Button
                                  key={event.event_id}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveUser(member.id, event.event_id)
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              ))}
                        </div>
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