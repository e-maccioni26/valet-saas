'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Mail, Users, Calendar, Shield, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { UserProfile } from '../../../types/team'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer le profil complet avec rôles et événements
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le profil',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', profile.id)

      if (error) throw error

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées',
        type: 'success',
      })

      await loadProfile()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const f = firstName?.[0]?.toUpperCase() || ''
    const l = lastName?.[0]?.toUpperCase() || ''
    return f + l || 'U'
  }

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Profil introuvable</p>
      </div>
    )
  }

  const isManager = profile.roles?.some((r: any) => r.role_name === 'manager')
  const isAdmin = profile.roles?.some((r: any) => r.role_name === 'admin')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos paramètres
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Sidebar avec avatar et infos de base */}
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold">
                  {profile.first_name} {profile.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Rôles
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile.roles && profile.roles.length > 0 ? (
                  profile.roles.map((role: any) => (
                    <Badge
                      key={role.role_id}
                      variant={getRoleBadgeVariant(role.role_name)}
                    >
                      {role.role_name === 'admin'
                        ? 'Administrateur'
                        : role.role_name === 'manager'
                        ? 'Manager'
                        : 'Voiturier'}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Aucun rôle</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Événements
              </Label>
              <div className="space-y-1">
                {profile.events && profile.events.length > 0 ? (
                  profile.events.map((event: any) => (
                    <div
                      key={event.event_id}
                      className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
                    >
                      {event.event_name}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun événement assigné
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu principal avec onglets */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <User className="mr-2 h-4 w-4" />
              Informations générales
            </TabsTrigger>
            {(isManager || isAdmin) && (
              <TabsTrigger value="team">
                <Users className="mr-2 h-4 w-4" />
                Gestion d'équipe
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Modifiez vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    L&apos;email ne peut pas être modifié
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer les modifications'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {(isManager || isAdmin) && (
            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion d&apos;équipe</CardTitle>
                  <CardDescription>
                    Gérez les membres de votre équipe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-12">
                    <div className="text-center">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">
                        Gestion d&apos;équipe
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Cette fonctionnalité sera disponible prochainement
                      </p>
                      <Button className="mt-4" variant="outline" asChild>
                        <a href="/valet/team">Accéder à la gestion d&apos;équipe</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}