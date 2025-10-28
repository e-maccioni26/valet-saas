// src/app/auth/login/page.tsx
'use client'

import { useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from './actions'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Optionnel : vérifier session et rediriger si déjà connecté
    const checkSession = async () => {
      const res = await fetch('/api/auth/session') // ou utiliser supabaseClient.auth.getSession() si côté client
      const json = await res.json()
      if (json?.session) {
        router.replace('/valet/dashboard')
      }
    }
    void checkSession()
  }, [router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Le form utilise "formAction" donc ce handleSubmit peut rester vide ou servir à des validations custom
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 space-y-4 bg-white rounded shadow"
      >
        <h2 className="text-xl font-bold text-center">Connexion Voiturier</h2>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email :</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">Mot de passe :</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="flex space-x-3">
          <button
            formAction={login}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Se connecter
          </button>
          <button
            formAction={signup}
            className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Créer un compte
          </button>
        </div>
      </form>
    </div>
  )
}
