'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/app/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Car, LogOut, Menu, Plus, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

const supabase = createSupabaseClient()

export default function ValetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace('/auth/login')
        return
      }

      const userId = session.user.id

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Erreur profil:', profileError)
      }

      setFirstName(profile?.first_name || 'Utilisateur')
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/valet/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden font-semibold sm:inline-block">
                ValetPro
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/valet/dashboard">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/valet/tickets/new">
                <Button variant="ghost" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau ticket
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-slate-200" />
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(firstName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium">{firstName}</p>
                    <p className="text-xs text-muted-foreground">Voiturier</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="hidden sm:flex"
                >
                  <LogOut className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t md:hidden">
            <nav className="container flex flex-col gap-1 p-4">
              <Link href="/valet/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/valet/tickets/new" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau ticket
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* CONTENU */}
      <main className="container py-6">{children}</main>
    </div>
  )
}