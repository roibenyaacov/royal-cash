'use client'

import { useState } from 'react'
import { BottomSheet } from './bottom-sheet'
import { Button } from './button'
import { Input } from './input'

interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => Promise<void>
  requireTyping?: string
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'ביטול',
  onConfirm,
  requireTyping,
}: ConfirmSheetProps) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  const canConfirm = !requireTyping || typed === requireTyping

  async function handleConfirm() {
    if (!canConfirm || loading) return
    setLoading(true)
    try {
      await onConfirm()
      setTyped('')
      onClose()
    } catch (err) {
      console.error('Confirm action failed:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setTyped('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{message}</p>
        {requireTyping && (
          <Input
            label={requireTyping}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? '...' : confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
