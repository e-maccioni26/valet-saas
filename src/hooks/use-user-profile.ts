'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import type { UserProfile, RoleName } from '@/types/database'

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError
        if (!session?.user) throw new Error('No session')

        // Récupérer le profil complet avec rôles et événements
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        if (!cancelled) {
          setProfile(data as UserProfile)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const hasRole = (roleName: RoleName): boolean => {
    return profile?.roles.some((r) => r.role_name === roleName) ?? false
  }

  const isManager = hasRole('manager')
  const isValet = hasRole('valet')
  const isAdmin = hasRole('admin')

  return {
    profile,
    loading,
    error,
    hasRole,
    isManager,
    isValet,
    isAdmin,
  }
}
