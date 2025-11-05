// src/lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/** Client admin (service_role) — pour les routes API côté serveur */
export const supabaseServerAdmin = createClient(
  process.env.SUPABASE_URL!,                // côté serveur
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // clé service
  { auth: { persistSession: false } }
)

/** Client serveur authentifié (clé anon + cookies) — pour RSC/SSR */
export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,   // clé anon publique
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // en Server Component, setAll peut être ignoré : c'est OK
          }
        },
      },
    }
  )
}