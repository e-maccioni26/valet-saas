'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../lib/supabaseServer'

export async function logout() {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.signOut()
  if (error) {
    // tu peux gérer une erreur ici
    console.error('Erreur lors de la déconnexion :', error.message)
  }
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
