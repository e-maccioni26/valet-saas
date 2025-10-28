import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getRequestHeader: (key) => req.headers.get(key) ?? undefined,
        getCookie: (key) => req.cookies.get(key)?.value,
        setCookie: (name, value, options) => {
          res.cookies.set(name, value, options)
        },
      },
    }
  )

  // check user
  const { data: { user }, error } = await supabase.auth.getUser()

  const isValetRoute = req.nextUrl.pathname.startsWith('/valet')
  const isAuthRoute  = req.nextUrl.pathname.startsWith('/auth')

  if (isValetRoute && !user && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/valet/:path*'],
}
