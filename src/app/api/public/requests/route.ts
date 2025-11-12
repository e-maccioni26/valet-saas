import { NextRequest, NextResponse } from 'next/server'
import { supabaseServerAdmin } from '../../../lib/supabaseServer'

// 🔓 Route publique : utilisée par les clients (pas besoin de session Supabase)
export async function POST(req: NextRequest) {
  try {
    const { token, type, pickup_eta_minutes, pickup_at, comment } = await req.json()

    if (!token || !type)
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    // 🧩 Trouver le ticket via le token
    const { data: ticket, error: ticketError } = await supabaseServerAdmin
      .from('tickets')
      .select('id, event_id')
      .eq('token', token)
      .single()

    if (ticketError || !ticket)
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })

    // 🔍 Trouver les voituriers liés à l’événement
    const { data: availableValets } = await supabaseServerAdmin
      .from('user_events')
      .select('user_id')
      .eq('event_id', ticket.event_id)

    let assigned_valet_id: string | null = null

    if (availableValets && availableValets.length > 0) {
      const { data: valetStats } = await supabaseServerAdmin
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

    // 💾 Insertion de la requête
    const { data, error } = await supabaseServerAdmin
      .from('requests')
      .insert({
        ticket_id: ticket.id,
        type,
        pickup_eta_minutes: pickup_eta_minutes ?? null,
        pickup_at: pickup_at ?? null,
        comment: comment ?? null,
        assigned_valet_id,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Request insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 🟢 Mise à jour du statut du ticket
    await supabaseServerAdmin
      .from('tickets')
      .update({ status: 'requested' })
      .eq('id', ticket.id)

    console.log(`✅ Nouvelle demande publique pour le ticket ${ticket.id}`)
    return NextResponse.json({ request: data })
  } catch (err: any) {
    console.error('🔥 Erreur interne:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: err.message },
      { status: 500 }
    )
  }
}