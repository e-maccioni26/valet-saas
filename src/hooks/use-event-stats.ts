'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import type { EventStats } from '@/types/database'

export function useEventStats(eventId?: string) {
  const [stats, setStats] = useState<EventStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      try {
        if (!eventId) {
          setLoading(false)
          return
        }

        const { data, error: statsError } = await supabase
          .from('event_stats')
          .select('*')
          .eq('event_id', eventId)
          .single()

        if (statsError) throw statsError

        if (!cancelled) {
          setStats(data as EventStats)
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

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [eventId])

  return { stats, loading, error, refetch: () => setLoading(true) }
}
