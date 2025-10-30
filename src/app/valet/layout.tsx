'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/app/lib/supabaseClient'

const supabase = createSupabaseClient()

export default function ValetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      // 1️⃣ Vérifie la session active
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace('/auth/login')
        return
      }

      // 2️⃣ Récupère l'utilisateur connecté
      const userId = session.user.id

      // 3️⃣ Récupère le profil (prénom)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Erreur lors du chargement du profil :', profileError)
      }

      setFirstName(profile?.first_name || 'Utilisateur')
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">🚗 Dashboard Voiturier</h1>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-gray-500 italic">Chargement...</span>
          ) : (
            <span>
              👋 Bonjour <b>{firstName}</b>
            </span>
          )}
          <button
            onClick={logout}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* CONTENU DU DASHBOARD */}
      <main className="p-6">{children}</main>
    </div>
  )
}