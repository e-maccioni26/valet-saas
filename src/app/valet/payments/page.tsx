// src/app/valet/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ExternalLink } from 'lucide-react'

type PaymentRow = {
  id: string
  event_id: string | null
  request_id: string | null
  currency: string | null
  service_amount: number | null
  tip_amount: number | null
  total_amount: number | null
  payment_status: string | null
  stripe_receipt_url: string | null
  created_at: string | null
  paid_at: string | null
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('all')

  useEffect(() => {
    load()
  }, [selectedEvent])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // évènements de l’utilisateur (pour le filtre)
    const { data: ue } = await supabase
      .from('user_events')
      .select('event_id, events(id, name)')
      .eq('user_id', user.id)

    const evts = (ue || []).map((u: any) => ({ id: u.events.id, name: u.events.name }))
    setEvents(evts)

    let q = supabase.from('payments').select('*').order('created_at', { ascending: false })
    // valet: ses paiements
    q = q.eq('valet_id', user.id)
    if (selectedEvent !== 'all') {
      q = q.eq('event_id', selectedEvent)
    }
    const { data } = await q
    setRows((data || []) as any)
    setLoading(false)
  }

  const fmt = (n: number | null | undefined, ccy: string | null) =>
    typeof n === 'number'
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format(n)
      : '—'

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paiements</h1>
          <p className="text-muted-foreground">Historique de vos paiements & pourboires</p>
        </div>

        <div className="w-[260px]">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par événement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous mes événements</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Événement</TableHead>
                  <TableHead className="text-right">Service</TableHead>
                  <TableHead className="text-right">Pourboire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Facture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun paiement
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.paid_at ? new Date(r.paid_at).toLocaleString('fr-FR') : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.event_id ?? '—'}</TableCell>
                      <TableCell className="text-right">{fmt(r.service_amount, r.currency)}</TableCell>
                      <TableCell className="text-right">{fmt(r.tip_amount, r.currency)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(r.total_amount, r.currency)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.payment_status === 'succeeded'
                              ? 'default'
                              : r.payment_status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {r.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.stripe_receipt_url ? (
                          <a
                            className="inline-flex items-center gap-1 underline"
                            href={r.stripe_receipt_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Voir <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}