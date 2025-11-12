'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  IconCar,
  IconDashboard,
  IconPlus,
  IconUsers,
  IconChartBar,
  IconSettings,
  IconHelp,
  IconUser,
} from '@tabler/icons-react'
import { supabase } from '@/app/lib/supabaseClient'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [])

  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer le profil avec les informations de base
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Récupérer les rôles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)

      const roles = userRoles?.map((r: any) => r.roles.name) || []

      setUserProfile({
        ...profile,
        email: user.email,
        roles
      })

      // Vérifier si l'utilisateur est manager ou admin
      const hasManagerRole = roles.includes('manager') || roles.includes('admin')
      setIsManager(hasManagerRole)
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Navigation principale
  const navMain = [
    {
      title: 'Dashboard',
      url: '/valet/dashboard',
      icon: IconDashboard,
      isActive: pathname === '/valet/dashboard',
    },
    {
      title: 'Nouveau ticket',
      url: '/valet/tickets/new',
      icon: IconPlus,
      isActive: pathname === '/valet/tickets/new',
    },
  ]

  // Ajouter les liens managers si l'utilisateur a le rôle
  if (isManager) {
    navMain.push({
      title: 'Mon équipe',
      url: '/valet/team',
      icon: IconUsers,
      isActive: pathname === '/valet/team',
    })
    navMain.push({
      title: 'Analytics',
      url: '/valet/analytics',
      icon: IconChartBar,
      isActive: pathname === '/valet/analytics',
    })
  }

  // Navigation secondaire
  const navSecondary = [
    {
      title: 'Mon profil',
      url: '/valet/profile',
      icon: IconUser,
    },
    {
      title: 'Paramètres',
      url: '/valet/settings',
      icon: IconSettings,
    },
    {
      title: 'Aide',
      url: '/valet/help',
      icon: IconHelp,
    },
  ]

  const userData = {
    name: userProfile
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Utilisateur'
      : 'Utilisateur',
    email: userProfile?.email || '',
    avatar: '/avatars/default.jpg',
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/valet/dashboard">
                <IconCar className="!size-5" />
                <span className="text-base font-semibold">ValetPro</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {!loading && <NavMain items={navMain} />}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}