'use client'

import { toast as sonnerToast } from 'sonner'

type ToastType = 'default' | 'success' | 'error' | 'info'

interface ToastOptions {
  title?: string
  description?: string
  type?: ToastType
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, type = 'default', duration = 4000, actionLabel, onAction } = options

    switch (type) {
      case 'success':
        sonnerToast.success(title ?? '', {
          description,
          duration,
          action: actionLabel ? { label: actionLabel, onClick: onAction } : undefined,
        })
        break
      case 'error':
        sonnerToast.error(title ?? '', {
          description,
          duration,
          action: actionLabel ? { label: actionLabel, onClick: onAction } : undefined,
        })
        break
      case 'info':
        sonnerToast.info(title ?? '', {
          description,
          duration,
          action: actionLabel ? { label: actionLabel, onClick: onAction } : undefined,
        })
        break
      default:
        sonnerToast(title ?? '', {
          description,
          duration,
          action: actionLabel ? { label: actionLabel, onClick: onAction } : undefined,
        })
        break
    }
  }

  return { toast }
}