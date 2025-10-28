import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createSupabaseServer() {
  const cookieStore = await cookies() 

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => (await cookieStore).get(name)?.value,
        set: async (name, value, options) => {
          (await cookieStore).set(name, value, options)
        },
        remove: async (name) => {
          (await cookieStore).delete(name)
        },
      },
    }
  )
}