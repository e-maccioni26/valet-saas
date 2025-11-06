'use client'

import { useCallback } from 'react'
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
  const toast = useCallback((options: ToastOptions) => {
    const {
      title,
      description,
      type = 'default',
      duration = 4000,
      actionLabel,
      onAction,
    } = options

    const common = {
      description,
      duration,
      action: actionLabel && onAction
        ? { label: actionLabel, onClick: (e: React.MouseEvent<HTMLButtonElement>) => onAction() }
        : undefined,
    }

    switch (type) {
      case 'success':
        sonnerToast.success(title ?? '', common)
        break
      case 'error':
        sonnerToast.error(title ?? '', common)
        break
      case 'info':
        sonnerToast.info(title ?? '', common)
        break
      default:
        sonnerToast(title ?? '', common)
        break
    }
  }, [])

  return { toast }
}