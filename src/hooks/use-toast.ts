'use client'

import { toast as sonnerToast } from 'sonner'

type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning'

export function useToast() {
  const toast = (options: {
    title?: string
    description?: string
    type?: ToastType
    duration?: number
    actionLabel?: string
    onAction?: () => void
  }) => {
    const { title, description, type = 'default', duration = 4000, actionLabel, onAction } = options

    return sonnerToast[type](title ?? '', {
      description,
      duration,
      action: actionLabel
        ? {
            label: actionLabel,
            onClick: onAction,
          }
        : undefined,
    })
  }

  return { toast }
}