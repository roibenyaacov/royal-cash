'use client'

import { useEffect, useCallback, type ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-h-[85vh] overflow-y-auto
          bg-surface rounded-t-[var(--radius-sheet)]
          animate-slide-up safe-bottom"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        {title && (
          <div className="px-4 pb-3">
            <h2 className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
          </div>
        )}
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
