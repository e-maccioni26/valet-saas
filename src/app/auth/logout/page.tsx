'use client'

import { useEffect } from 'react'
import { createSupabaseClient } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const supabase = createSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut()
      router.push('/auth/login')
    }
    signOut()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center text-gray-700">Déconnexion en cours...</div>
    </div>
  )
}