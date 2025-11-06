'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { useUserProfile } from '@/hooks/use-user-profile'

export default function ValetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { profile, loading, isManager, isValet, isAdmin } = useUserProfile()

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        if (!cancelled) router.replace('/auth/login')
      }
    }

    checkAuth()
    return () => {
      cancelled = true
    }
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) return 'U'
    return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase()
  }

  const getRoleBadge = () => {
    if (isAdmin) return 'Admin'
    if (isManager) return 'Manager'
    if (isValet) return 'Voiturier'
    return 'Utilisateur'
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* SIDEBAR */}
      {!loading && (
        <DashboardSidebar isManager={isManager} isValet={isValet} isAdmin={isAdmin} />
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h2 className="text-lg font-semibold">
              {loading ? 'Chargement...' : `Bonjour, ${profile?.first_name || 'Utilisateur'}`}
            </h2>
            <p className="text-sm text-muted-foreground">{getRoleBadge()}</p>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(profile?.first_name || null, profile?.last_name || null)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/valet/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}