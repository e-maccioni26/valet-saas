'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const supabase = createSupabaseClient()

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handle = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erreur Supabase:', error)
        router.replace('/auth/login')
        return
      }
      router.replace('/valet/dashboard')
    }
    handle()
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-gray-600">Connexion en cours...</p>
    </div>
  )
}