'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../lib/supabaseServer'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServer()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/auth/error')
  }

  revalidatePath('/', 'layout')
  redirect('/valet/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createSupabaseServer()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/auth/error')
  }

  revalidatePath('/', 'layout')
  redirect('/valet/dashboard')
}
