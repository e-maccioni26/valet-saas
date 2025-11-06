import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session)
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const payload = await req.json()
    const { ticketId, type, pickup_eta_minutes, pickup_at, comment } = payload

    if (!ticketId || !type)
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    // Vérifier le ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, event_id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket)
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })

    // Trouver les voituriers liés à l’événement
    const { data: availableValets } = await supabase
      .from('user_events')
      .select('user_id')
      .eq('event_id', ticket.event_id)

    let assigned_valet_id: string | null = null

    if (availableValets && availableValets.length > 0) {
      const { data: valetStats } = await supabase
        .from('requests')
        .select('assigned_valet_id')
        .in('assigned_valet_id', availableValets.map(v => v.user_id))
        .is('handled_at', null)

      const valetCounts = new Map<string, number>()
      availableValets.forEach(v => valetCounts.set(v.user_id, 0))
      valetStats?.forEach(stat => {
        if (stat.assigned_valet_id) {
          valetCounts.set(
            stat.assigned_valet_id,
            (valetCounts.get(stat.assigned_valet_id) || 0) + 1
          )
        }
      })

      let minCount = Infinity
      valetCounts.forEach((count, valetId) => {
        if (count < minCount) {
          minCount = count
          assigned_valet_id = valetId
        }
      })
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        ticket_id: ticketId,
        type,
        pickup_eta_minutes: pickup_eta_minutes ?? null,
        pickup_at: pickup_at ?? null,
        comment: comment ?? null,
        assigned_valet_id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Request insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase
      .from('tickets')
      .update({ status: 'requested' })
      .eq('id', ticketId)

    return NextResponse.json({ request: data })
  } catch (err: any) {
    console.error('🔥 Erreur interne:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: err.message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session)
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userId = session.user.id

    // ✅ Nouvelle version : appel RPC plus fiable
    const { data: role } = await supabase.rpc('get_user_role')
    const userIsManager = role === 'manager'

    let query = supabase
      .from('requests')
      .select(`
        *,
        ticket:tickets(
          short_code,
          event_id,
          vehicle:vehicles(
            brand,
            model,
            color,
            license_plate,
            parking_location,
            vehicle_condition,
            notes
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (!userIsManager) {
      const { data: userEvents } = await supabase
        .from('user_events')
        .select('event_id')
        .eq('user_id', userId)

      const eventIds = userEvents?.map(e => e.event_id) || []

      query = query.or(`assigned_valet_id.eq.${userId},ticket.event_id.in.(${eventIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur de chargement des requêtes:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (err: any) {
    console.error('🔥 Erreur interne:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: err.message },
      { status: 500 }
    )
  }
}