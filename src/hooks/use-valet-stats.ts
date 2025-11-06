'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import type { ValetStats } from '@/types/database'

export function useValetStats(eventId?: string) {
  const [stats, setStats] = useState<ValetStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      try {
        let query = supabase.from('valet_stats').select('*')

        if (eventId) {
          query = query.eq('event_id', eventId)
        }

        const { data, error: statsError } = await query

        if (statsError) throw statsError

        if (!cancelled) {
          setStats(data as ValetStats[])
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

  return { stats, loading, error }
}
