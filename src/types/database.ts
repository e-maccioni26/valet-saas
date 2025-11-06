// Types pour la base de données Supabase

export type RoleName = 'admin' | 'manager' | 'valet'

export interface Role {
  id: string
  name: RoleName
  description: string | null
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  created_at: string
  role?: Role
}

export interface UserEvent {
  id: string
  user_id: string
  event_id: string
  assigned_by: string | null
  assigned_at: string
  event?: Event
}

export interface Event {
  id: string
  name: string
  created_at: string
  // Ajoutez d'autres champs selon votre table events
}

export interface Payment {
  id: string
  request_id: string | null
  event_id: string | null
  valet_id: string | null
  currency: string
  service_amount: number
  tip_amount: number
  total_amount: number
  payment_method: string | null
  payment_status: string
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  stripe_customer_id: string | null
  stripe_receipt_url: string | null
  metadata: Record<string, any>
  last_webhook_event: string | null
  notes: string | null
  paid_at: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  roles: Array<{
    role_id: string
    role_name: RoleName
    role_description: string | null
  }>
  events: Array<{
    event_id: string
    event_name: string
    assigned_at: string
  }>
}

export interface ValetStats {
  valet_id: string
  email: string
  first_name: string | null
  last_name: string | null
  event_id: string | null
  event_name: string | null
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
