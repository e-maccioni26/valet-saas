'use client';
import { useEffect, useState } from 'react';

export default function ClientRequestPage({ params }: { params: { token: string } }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<number | null>(15);
  const [at, setAt] = useState<string>(''); // HH:MM
  const [comment, setComment] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tickets/by-token/${params.token}`);
      const data = await res.json();
      setTicket(data.ticket);
      setLoading(false);
    })();
  }, [params.token]);

  async function sendRequest(kind: 'pickup' | 'keys' | 'other') {
    const body: any = { type: kind, ticketId: ticket.id, comment };
    if (eta !== null) body.pickup_eta_minutes = eta;
    if (at) body.pickup_at = new Date(`${new Date().toDateString()} ${at}:00`).toISOString();

    const res = await fetch('/api/requests', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) return alert('Erreur envoi demande');
    alert('Votre demande a été transmise aux voituriers ✅');
  }

  if (loading) return <div className="p-6">Chargement…</div>;
  if (!ticket) return <div className="p-6">Ticket introuvable.</div>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold">Ticket #{ticket.short_code}</h1>
      <p className="text-gray-600 mb-4">Souhaitez-vous récupérer votre véhicule ?</p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="w-40">Dans (minutes) :</label>
          <input type="number" className="border p-2 rounded w-32" value={eta ?? ''} onChange={e=>setEta(Number(e.target.value)||0)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-40">Ou à (heure) :</label>
          <input type="time" className="border p-2 rounded" value={at} onChange={e=>setAt(e.target.value)} />
        </div>
        <textarea className="border p-2 rounded w-full" placeholder="Message au voiturier (optionnel)" value={comment} onChange={e=>setComment(e.target.value)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={()=>sendRequest('pickup')} className="py-2 rounded bg-black text-white">Récupérer</button>
        <button onClick={()=>sendRequest('keys')} className="py-2 rounded border">Juste les clés</button>
        <button onClick={()=>sendRequest('other')} className="py-2 rounded border">Autre</button>
      </div>
    </div>
  );
}
