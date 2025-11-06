// Types pour la gestion d'équipe ValetPro

export type UserRole = 'admin' | 'manager' | 'valet'

export interface Role {
  id: string
  name: UserRole
  description: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  roles: {
    role_id: string
    role_name: UserRole
    role_description: string
  }[]
  events: {
    event_id: string
    event_name: string
    assigned_at: string
  }[]
}

export interface ValetStats {
  valet_id: string
  email: string
  first_name: string | null
  last_name: string | null
  event_id: string
  event_name: string
  total_requests: number
  handled_requests: number
  total_tips: number
  total_service: number
  total_revenue: number
  completion_rate: number
  avg_handling_time_minutes: number | null
}

export interface EventStats {
  event_id: string
  event_name: string
  total_valets: number
  total_requests: number
  handled_requests: number
  total_service_revenue: number
  total_tips: number
  total_revenue: number
  total_vehicles: number
}