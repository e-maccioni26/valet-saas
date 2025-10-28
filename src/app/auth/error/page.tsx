'use client'

export default function ErrorPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold text-red-600">Erreur de connexion ❌</h1>
      <p className="text-gray-700 mt-2">Désolé, une erreur est survenue. Essaie à nouveau.</p>
    </div>
  )
}
