'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from './actions'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch('/api/auth/session')
      const { session } = await res.json()
      if (session) router.replace('/valet/dashboard')
    }
    checkSession()
  }, [router])

  return (
    <form className="flex flex-col space-y-3 max-w-sm mx-auto mt-20">
      <label>Email :</label>
      <input name="email" type="email" required className="border p-2 rounded" />
      <label>Mot de passe :</label>
      <input name="password" type="password" required className="border p-2 rounded" />

      <div className="flex space-x-3">
        <button formAction={login} className="bg-blue-600 text-white px-4 py-2 rounded">
          Se connecter
        </button>
        <button formAction={signup} className="bg-gray-200 px-4 py-2 rounded">
          Créer un compte
        </button>
      </div>
    </form>
  )
}
