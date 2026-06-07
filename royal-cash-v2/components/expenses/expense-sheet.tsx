'use client'

import { useState, useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Currency, ExpenseSplitType, Player } from '@/lib/domain/types'

type ExpenseSheetProps = {
  open: boolean
  onClose: () => void
  players: Player[]
  currency: Currency
  onSubmit: (
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: ExpenseSplitType,
    participants: { playerId: string; amountOwed: number }[],
  ) => void
}

export function ExpenseSheet({
  open,
  onClose,
  players,
  currency,
  onSubmit,
}: ExpenseSheetProps) {
  const [paidBy, setPaidBy] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [splitType, setSplitType] = useState<ExpenseSplitType>('equal_split')
  const [participantIds, setParticipantIds] = useState<Set<string>>(
    new Set(players.map((p) => p.id)),
  )

  const amountNum = parseInt(amount) || 0
  const perPerson = useMemo(() => {
    if (splitType !== 'equal_split' || participantIds.size === 0) return 0
    return Math.floor(amountNum / participantIds.size)
  }, [amountNum, participantIds.size, splitType])

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (!paidBy || !amountNum || !description.trim() || participantIds.size === 0) return

    let parts: { playerId: string; amountOwed: number }[]

    if (splitType === 'equal_split') {
      const base = Math.floor(amountNum / participantIds.size)
      const remainder = amountNum - base * participantIds.size
      const ids = [...participantIds]
      parts = ids.map((id, i) => ({
        playerId: id,
        amountOwed: base + (i < remainder ? 1 : 0),
      }))
    } else {
      parts = [...participantIds].map((id) => ({
        playerId: id,
        amountOwed: amountNum,
      }))
    }

    onSubmit(paidBy, amountNum, description.trim(), splitType, parts)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setPaidBy('')
    setAmount('')
    setDescription('')
    setSplitType('equal_split')
    setParticipantIds(new Set(players.map((p) => p.id)))
  }

  const symbol = t.currency[currency]

  return (
    <BottomSheet open={open} onClose={onClose} title={t.expenses.title}>
      <div className="flex flex-col gap-4">
        {/* Who paid */}
        <div>
          <p className="text-sm text-text-secondary mb-2">{t.expenses.whoPaid}</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setPaidBy(p.id)}
                className={`rounded-full px-3 py-1.5 text-sm border min-h-[36px] transition-colors ${
                  paidBy === p.id
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-secondary'
                }`}
              >
                {p.display_name}
              </button>
            ))}
          </div>
        </div>

        <MoneyInput
          label={t.expenses.howMuch}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          currency={currency}
        />

        <Input
          label={t.expenses.whatFor}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="פיצה"
        />

        {/* Split type */}
        <div>
          <div className="flex gap-2">
            {(
              [
                ['equal_split', t.expenses.equalSplit],
                ['custom_split', t.expenses.customSplit],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSplitType(type)}
                className={`flex-1 rounded-[var(--radius-button)] px-2 py-2 text-xs border min-h-[36px] transition-colors ${
                  splitType === type
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <p className="text-sm text-text-secondary mb-2">{t.expenses.whoParticipates}</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleParticipant(p.id)}
                className={`rounded-full px-3 py-1.5 text-sm border min-h-[36px] transition-colors ${
                  participantIds.has(p.id)
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-muted'
                }`}
              >
                {p.display_name}
              </button>
            ))}
          </div>
          {splitType === 'equal_split' && amountNum > 0 && participantIds.size > 0 && (
            <p className="text-xs text-text-muted mt-2">
              {symbol}{perPerson} לאדם
            </p>
          )}
        </div>

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!paidBy || !amountNum || !description.trim() || participantIds.size === 0}
        >
          {t.expenses.saveExpense}
        </Button>
      </div>
    </BottomSheet>
  )
}
