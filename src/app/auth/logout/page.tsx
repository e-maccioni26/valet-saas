'use client'

import { useEffect } from 'react'
import { logout } from './actions'

export default function LogoutPage() {
  useEffect(() => {
    // déclenche la server action logout
    void logout()
  }, [])

  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-lg">Déconnexion en cours…</p>
    </div>
  )
}
