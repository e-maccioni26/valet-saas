'use client'

import { useState } from 'react'
import { ulid } from 'ulid'
import QRCode from 'qrcode'

export default function NewTicketPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [shortCode, setShortCode] = useState('0001')
  const [ticketUrl, setTicketUrl] = useState<string>('')

  async function handleCreate() {
    const token = ulid()

    const res = await fetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ shortCode, token }),
    })
    if (!res.ok) return alert('Erreur création ticket')

    const url = `${window.location.origin}/r/${token}`

    // Génération du QR Code
    const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1 })
    setQrDataUrl(dataUrl)
    setTicketUrl(url)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Créer un nouveau ticket</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border p-2 rounded"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Créer
        </button>
      </div>

      {qrDataUrl && (
        <div className="mt-6 text-center">
          <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="border p-2 mx-auto hover:scale-105 transition-transform duration-150 cursor-pointer"
            />
          </a>
          <p className="mt-2 text-sm text-gray-600">
            Scanne le QR ou clique dessus pour simuler le client
          </p>
          <p className="mt-1 text-sm">
            <a href={ticketUrl} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              {ticketUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
