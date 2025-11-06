import { createSupabaseServer } from '../app/lib/supabaseServer'
import type { UserRole } from '@/types/team'

/**
 * Récupère les rôles de l'utilisateur connecté
 */
export async function getCurrentUserRoles(): Promise<UserRole[]> {
  const supabase = await createSupabaseServer()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)

  return data?.map((r: any) => r.roles.name as UserRole) || []
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const roles = await getCurrentUserRoles()
  return roles.includes(role)
}

/**
 * Vérifie si l'utilisateur est manager
 */
export async function isManager(): Promise<boolean> {
  return hasRole('manager')
}

/**
 * Vérifie si l'utilisateur est admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin')
}

/**
 * Récupère les événements d'un utilisateur
 */
export async function getUserEvents(userId?: string) {
  const supabase = await createSupabaseServer()
  
  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    targetUserId = user.id
  }

  const { data } = await supabase
    .from('user_events')
    .select('event_id, events(id, name)')
    .eq('user_id', targetUserId)

  return data?.map((ue: any) => ({
    id: ue.events.id,
    name: ue.events.name
  })) || []
}

/**
 * Récupère le profil complet de l'utilisateur
 */
export async function getUserProfile(userId?: string) {
  const supabase = await createSupabaseServer()
  
  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    targetUserId = user.id
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}