'use client'

import { useState, useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  buildExpenseParticipants,
  sumCustomAmounts,
} from '@/lib/calculations/expense-split'
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

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  )
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
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const amountNum = parseInt(amount, 10) || 0
  const symbol = t.currency[currency]

  const perPerson = useMemo(() => {
    if (splitType !== 'equal_split' || participantIds.size === 0) return 0
    return Math.floor(amountNum / participantIds.size)
  }, [amountNum, participantIds.size, splitType])

  const customSum = useMemo(
    () => sumCustomAmounts([...participantIds], customAmounts),
    [participantIds, customAmounts],
  )

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSplitTypeChange = (type: ExpenseSplitType) => {
    setSplitType(type)
    setError('')
    if (type === 'equal_split') {
      setParticipantIds(new Set(players.map((p) => p.id)))
    }
  }

  const handleSubmit = () => {
    setError('')
    if (!paidBy || !amountNum || !description.trim() || participantIds.size === 0) return

    const customParsed: Record<string, number> = {}
    if (splitType === 'custom_split') {
      for (const id of participantIds) {
        customParsed[id] = parseInt(customAmounts[id] ?? '0', 10) || 0
      }
    }

    const result = buildExpenseParticipants({
      splitType,
      amount: amountNum,
      participantIds: [...participantIds],
      customAmounts: splitType === 'custom_split' ? customParsed : undefined,
    })

    if (!result.ok) {
      if (result.error === 'split_sum_mismatch') {
        setError(
          fill(t.expenses.splitSumMismatch, {
            current: customSum,
            total: amountNum,
          }),
        )
      }
      return
    }

    onSubmit(paidBy, amountNum, description.trim(), splitType, result.participants)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setPaidBy('')
    setAmount('')
    setDescription('')
    setSplitType('equal_split')
    setParticipantIds(new Set(players.map((p) => p.id)))
    setCustomAmounts({})
    setError('')
  }

  const canSubmit =
    paidBy &&
    amountNum > 0 &&
    description.trim() &&
    participantIds.size > 0 &&
    (splitType !== 'custom_split' || customSum === amountNum)

  return (
    <BottomSheet open={open} onClose={onClose} title={t.expenses.title}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-text-secondary mb-2">{t.expenses.whoPaid}</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
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
          placeholder={t.expenses.descriptionPlaceholder}
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ['equal_split', t.expenses.equalSplit],
                ['custom_split', t.expenses.customSplit],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSplitTypeChange(type)}
                className={`flex-1 min-w-[90px] rounded-[var(--radius-button)] px-2 py-2 text-xs border min-h-[36px] transition-colors ${
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

        <div>
          <p className="text-sm text-text-secondary mb-2">{t.expenses.whoParticipates}</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
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
              {fill(t.expenses.perPerson, { amount: `${symbol}${perPerson}` })}
            </p>
          )}

          {splitType === 'custom_split' && participantIds.size > 0 && (
            <div className="flex flex-col gap-3 mt-3">
              {[...participantIds].map((id) => {
                const player = players.find((p) => p.id === id)
                if (!player) return null
                return (
                  <MoneyInput
                    key={id}
                    label={player.display_name}
                    value={customAmounts[id] ?? ''}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                    currency={currency}
                  />
                )
              })}
              {amountNum > 0 && customSum !== amountNum && (
                <p className="text-xs text-warning">
                  {fill(t.expenses.customSplitRemaining, {
                    amount: `${symbol}${amountNum - customSum}`,
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <Button fullWidth onClick={handleSubmit} disabled={!canSubmit}>
          {t.expenses.saveExpense}
        </Button>
      </div>
    </BottomSheet>
  )
}
