'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
const supabase = createClient()
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handle = async () => {
      await supabase.auth.getSession()
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
