// src/lib/rbac.ts
'use client'

import { supabase } from '@/app/lib/supabaseClient'

export type UserRole = 'admin' | 'manager' | 'valet'

export interface UserWithRoles {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  roles: Array<{
    role_id: string
    role_name: UserRole
    role_description: string
  }>
  events: Array<{
    event_id: string
    event_name: string
    event_type: string
    assigned_at: string
  }>
}

/**
 * Récupère le profil complet de l'utilisateur avec ses rôles et événements
 */
export async function getUserProfile(userId?: string): Promise<UserWithRoles | null> {
  try {
    // Si pas d'ID fourni, récupère l'utilisateur courant
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      userId = user.id
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserWithRoles
  } catch (err) {
    console.error('Unexpected error in getUserProfile:', err)
    return null
  }
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export function hasRole(user: UserWithRoles | null, role: UserRole): boolean {
  if (!user || !user.roles) return false
  return user.roles.some(r => r.role_name === role)
}

/**
 * Vérifie si l'utilisateur est un manager ou admin
 */
export function isManager(user: UserWithRoles | null): boolean {
  return hasRole(user, 'manager') || hasRole(user, 'admin')
}

/**
 * Vérifie si l'utilisateur est un admin
 */
export function isAdmin(user: UserWithRoles | null): boolean {
  return hasRole(user, 'admin')
}

/**
 * Vérifie si l'utilisateur est un voiturier
 */
export function isValet(user: UserWithRoles | null): boolean {
  return hasRole(user, 'valet')
}

/**
 * Récupère les événements d'un utilisateur
 */
export async function getUserEvents(userId?: string) {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      userId = user.id
    }

    const { data, error } = await supabase
      .from('user_events')
      .select(`
        *,
        event:events(
          id,
          name,
          type,
          date,
          status,
          organization:organizations(name, type)
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user events:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error in getUserEvents:', err)
    return []
  }
}

/**
 * Assigne un rôle à un utilisateur (Manager/Admin only)
 */
export async function assignRole(userId: string, roleName: UserRole) {
  try {
    // Récupère l'ID du rôle
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (roleError || !role) {
      throw new Error(`Role ${roleName} not found`)
    }

    // Assigne le rôle
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: role.id
      })
      .select()

    if (error) {
      console.error('Error assigning role:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Unexpected error in assignRole:', err)
    throw err
  }
}

/**
 * Retire un rôle à un utilisateur (Manager/Admin only)
 */
export async function removeRole(userId: string, roleName: UserRole) {
  try {
    // Récupère l'ID du rôle
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (roleError || !role) {
      throw new Error(`Role ${roleName} not found`)
    }

    // Retire le rôle
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', role.id)

    if (error) {
      console.error('Error removing role:', error)
      throw error
    }
  } catch (err) {
    console.error('Unexpected error in removeRole:', err)
    throw err
  }
}

/**
 * Assigne un utilisateur à un événement (Manager/Admin only)
 */
export async function assignUserToEvent(userId: string, eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_events')
      .insert({
        user_id: userId,
        event_id: eventId,
        assigned_by: user.id
      })
      .select()

    if (error) {
      console.error('Error assigning user to event:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Unexpected error in assignUserToEvent:', err)
    throw err
  }
}

/**
 * Retire un utilisateur d'un événement (Manager/Admin only)
 */
export async function removeUserFromEvent(userId: string, eventId: string) {
  try {
    const { error } = await supabase
      .from('user_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error removing user from event:', error)
      throw error
    }
  } catch (err) {
    console.error('Unexpected error in removeUserFromEvent:', err)
    throw err
  }
}

/**
 * Récupère tous les utilisateurs d'un événement (Manager/Admin only)
 */
export async function getEventUsers(eventId: string) {
  try {
    const { data, error } = await supabase
      .from('user_events')
      .select(`
        *,
        profiles!inner(
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error fetching event users:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error in getEventUsers:', err)
    return []
  }
}

/**
 * Récupère les statistiques d'un voiturier
 */
export async function getValetStats(valetId: string, eventId?: string) {
  try {
    let query = supabase
      .from('valet_stats')
      .select('*')
      .eq('valet_id', valetId)

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching valet stats:', error)
      return null
    }

    return data?.[0] || null
  } catch (err) {
    console.error('Unexpected error in getValetStats:', err)
    return null
  }
}

/**
 * Récupère les statistiques d'un événement (Manager/Admin only)
 */
export async function getEventStats(eventId: string) {
  try {
    const { data, error } = await supabase
      .from('event_stats')
      .select('*')
      .eq('event_id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event stats:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Unexpected error in getEventStats:', err)
    return null
  }
}