'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (email !== confirmEmail) {
      alert("Les e-mails ne correspondent pas.")
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      alert('Compte créé ! Vérifie tes e-mails pour confirmer ton inscription.')
      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl shadow-md w-96 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Inscription</h2>

        <input
          type="text"
          placeholder="Prénom"
          className="border p-2 w-full rounded"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Nom"
          className="border p-2 w-full rounded"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Confirmer l'email"
          className="border p-2 w-full rounded"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="border p-2 w-full rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white w-full py-2 rounded hover:bg-gray-800 transition"
        >
          {loading ? 'Création...' : 'Créer le compte'}
        </button>

        <p className="text-center text-sm">
          Déjà un compte ?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Connexion
          </a>
        </p>
      </form>
    </div>
  )
}