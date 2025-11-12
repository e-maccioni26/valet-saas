// src/hooks/use-user-role.ts
'use client'

import { useState, useEffect } from 'react'
import { getUserProfile, isManager, isAdmin, isValet, type UserWithRoles } from '@/lib/rbac'

export function useUserRole() {
  const [user, setUser] = useState<UserWithRoles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true)
        const profile = await getUserProfile()
        setUser(profile)
        setError(null)
      } catch (err) {
        console.error('Error loading user profile:', err)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [])

  return {
    user,
    loading,
    error,
    isManager: isManager(user),
    isAdmin: isAdmin(user),
    isValet: isValet(user),
    hasEvents: user?.events && user.events.length > 0,
    refetch: async () => {
      const profile = await getUserProfile()
      setUser(profile)
    }
  }
}