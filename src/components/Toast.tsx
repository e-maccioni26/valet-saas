'use client'
import { useEffect } from 'react'

export default function Toast({ open, title, desc, onClose }:{
  open:boolean, title:string, desc?:string, onClose:()=>void
}) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="shadow-lg rounded-lg bg-white border p-4 w-80">
        <div className="font-semibold">{title}</div>
        {desc ? <div className="text-sm text-gray-600 mt-1">{desc}</div> : null}
      </div>
    </div>
  )
}
