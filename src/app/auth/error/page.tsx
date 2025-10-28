'use client'

export default function AuthErrorPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-red-600">Erreur d’authentification ❌</h1>
      <p className="mt-2 text-gray-600">Vérifie ton email ou ton mot de passe.</p>
    </div>
  )
}
