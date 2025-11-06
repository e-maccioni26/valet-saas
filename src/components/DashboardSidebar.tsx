'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  User,
  Plus,
  LucideIcon,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: ('manager' | 'valet' | 'admin')[]
}

interface DashboardSidebarProps {
  isManager: boolean
  isValet: boolean
  isAdmin: boolean
}

export function DashboardSidebar({ isManager, isValet, isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/valet/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Nouveau ticket',
      href: '/valet/tickets/new',
      icon: Plus,
    },
    {
      title: 'Analytics',
      href: '/valet/analytics',
      icon: BarChart3,
      roles: ['manager', 'admin'],
    },
    {
      title: 'Équipe',
      href: '/valet/team',
      icon: Users,
      roles: ['manager', 'admin'],
    },
    {
      title: 'Profil',
      href: '/valet/profile',
      icon: User,
    },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return (
      (isManager && item.roles.includes('manager')) ||
      (isAdmin && item.roles.includes('admin')) ||
      (isValet && item.roles.includes('valet'))
    )
  })

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/valet/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">ValetPro</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
