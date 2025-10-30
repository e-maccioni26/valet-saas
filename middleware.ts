import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()

  // 🔒 Redirige vers /auth/login si non connecté
  if (!user && url.pathname.startsWith('/valet')) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 🚫 Redirige vers /valet/dashboard si déjà connecté
  if (user && url.pathname.startsWith('/auth')) {
    url.pathname = '/valet/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/valet/:path*', '/auth/:path*'],
}