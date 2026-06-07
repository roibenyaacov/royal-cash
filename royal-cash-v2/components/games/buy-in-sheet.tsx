'use client'

import { useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Currency, Player } from '@/lib/domain/types'

type BuyInSheetProps = {
  open: boolean
  onClose: () => void
  player: Player | null
  defaultAmount: number
  currency: Currency
  onSubmit: (playerId: string, amount: number, note?: string) => void
}

export function BuyInSheet({
  open,
  onClose,
  player,
  defaultAmount,
  currency,
  onSubmit,
}: BuyInSheetProps) {
  const [amount, setAmount] = useState(String(defaultAmount))
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!player || !amount) return
    onSubmit(player.id, parseInt(amount), note || undefined)
    setAmount(String(defaultAmount))
    setNote('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t.buyIn.title}>
      <div className="flex flex-col gap-4">
        {player && (
          <div className="bg-surface-elevated rounded-[var(--radius-input)] px-3 py-3 text-text-primary">
            {player.display_name}
          </div>
        )}

        <MoneyInput
          label={t.buyIn.amount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          currency={currency}
          autoFocus
        />

        <Input
          label={t.buyIn.note}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder=""
        />

        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            {t.buyIn.cancel}
          </Button>
          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={!amount || parseInt(amount) <= 0}
          >
            {t.buyIn.save}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
