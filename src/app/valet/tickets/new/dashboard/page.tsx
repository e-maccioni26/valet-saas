'use client';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: reqs } = await supabase.from('requests').select('*, tickets:ticket_id(short_code)');
      setRequests(reqs ?? []);
      const { data: tks } = await supabase.from('tickets').select('*');
      setTickets(tks ?? []);
    })();

    const ch = supabase
      .channel('requests-ch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
        setRequests(prev => [payload.new as any, ...prev]);
        // ici: toast/son/notif visuelle
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="p-6 grid md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Demandes en temps réel</h2>
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="border p-3 rounded">
              <div className="font-medium">Ticket #{r.tickets?.short_code}</div>
              <div className="text-sm text-gray-600">
                {r.type === 'pickup' ? <>Récupération {r.pickup_eta_minutes ? `dans ${r.pickup_eta_minutes} min` : ''} {r.pickup_at ? `à ${new Date(r.pickup_at).toLocaleTimeString()}` : ''}</> : r.type === 'keys' ? 'Restitution des clés' : 'Autre demande'}
              </div>
              {r.comment && <div className="text-sm mt-1">Note: {r.comment}</div>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Véhicules garés</h2>
        <ul className="space-y-2">
          {tickets.map(t => (
            <li key={t.id} className="border p-3 rounded flex justify-between">
              <div>#{t.short_code}</div>
              <div className="text-sm text-gray-600">{t.status}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
