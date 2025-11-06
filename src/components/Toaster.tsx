'use client'

import { Toaster } from '@/components/ui/sonner'

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand
      toastOptions={{
        classNames: {
          toast: 'border border-border shadow-md bg-background/90 backdrop-blur',
          title: 'text-foreground font-semibold',
          description: 'text-muted-foreground text-sm',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
        },
      }}
    />
  )
}