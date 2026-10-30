'use client'

import { useState, useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoneyInput } from '@/components/ui/money-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import {
  buildExpenseParticipants,
  sumCustomAmounts,
} from '@/lib/calculations/expense-split'
import type {
  Currency,
  Expense,
  ExpenseParticipant,
  ExpenseSplitType,
  Player,
} from '@/lib/domain/types'

/** The expense being corrected, with the split it currently has. */
export type ExpenseDraft = {
  expense: Expense
  participants: ExpenseParticipant[]
}

type ExpenseSheetProps = {
  open: boolean
  onClose: () => void
  /** Players offered as payer/participants when adding. */
  players: Player[]
  /**
   * Everyone sitting at this game. Used only to resolve a participant of
   * an edited expense who has since dropped to zero buy-ins and so is no
   * longer in `players` — without this their share would silently vanish
   * from the split the moment the expense was reopened.
   */
  rosterPlayers?: Player[]
  currency: Currency
  /** Set to edit an existing expense; omit/null to add a new one. */
  editing?: ExpenseDraft | null
  onSubmit: (
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: ExpenseSplitType,
    participants: { playerId: string; amountOwed: number }[],
  ) => void
  onUpdate?: (
    expenseId: string,
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: ExpenseSplitType,
    participants: { playerId: string; amountOwed: number }[],
  ) => void
  onDelete?: (expenseId: string) => void
  /** Message from a failed save, rendered above the submit button. */
  error?: string
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
  rosterPlayers,
  currency,
  editing,
  onSubmit,
  onUpdate,
  onDelete,
  error: externalError,
}: ExpenseSheetProps) {
  // The form holds its own draft state seeded from `editing`. Remounting it
  // on a `key` change is what resets that state when the sheet switches
  // between adding and editing a particular expense — cheaper and less
  // error-prone than mirroring props into state from an effect.
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? t.expenses.editTitle : t.expenses.title}
    >
      <ExpenseForm
        key={editing?.expense.id ?? 'new'}
        players={players}
        rosterPlayers={rosterPlayers ?? players}
        currency={currency}
        editing={editing ?? null}
        onClose={onClose}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        onDelete={onDelete}
        externalError={externalError}
      />
    </BottomSheet>
  )
}

type ExpenseFormProps = {
  players: Player[]
  rosterPlayers: Player[]
  currency: Currency
  editing: ExpenseDraft | null
  onClose: () => void
  onSubmit: ExpenseSheetProps['onSubmit']
  onUpdate: ExpenseSheetProps['onUpdate']
  onDelete: ExpenseSheetProps['onDelete']
  externalError?: string
}

function ExpenseForm({
  players,
  rosterPlayers,
  currency,
  editing,
  onClose,
  onSubmit,
  onUpdate,
  onDelete,
  externalError,
}: ExpenseFormProps) {
  // Anyone referenced by the expense being edited has to stay selectable
  // even if they are no longer among the table's visible players.
  const formPlayers = useMemo(() => {
    if (!editing) return players
    const shown = new Set(players.map((p) => p.id))
    const referenced = new Set<string>([
      editing.expense.paid_by_player_id,
      ...editing.participants.map((p) => p.player_id),
    ])
    const missing = rosterPlayers.filter(
      (p) => referenced.has(p.id) && !shown.has(p.id),
    )
    return missing.length > 0 ? [...players, ...missing] : players
  }, [players, rosterPlayers, editing])

  const [paidBy, setPaidBy] = useState<string>(
    editing?.expense.paid_by_player_id ?? '',
  )
  const [amount, setAmount] = useState(
    editing ? String(editing.expense.amount) : '',
  )
  const [description, setDescription] = useState(
    editing?.expense.description ?? '',
  )
  const [splitType, setSplitType] = useState<ExpenseSplitType>(
    editing?.expense.split_type ?? 'equal_split',
  )
  const [participantIds, setParticipantIds] = useState<Set<string>>(() =>
    editing
      ? new Set(editing.participants.map((p) => p.player_id))
      : new Set(players.map((p) => p.id)),
  )
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    () => {
      if (!editing) return {}
      const seeded: Record<string, string> = {}
      for (const p of editing.participants) {
        seeded[p.player_id] = String(p.amount_owed)
      }
      return seeded
    },
  )
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

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
      setParticipantIds(new Set(formPlayers.map((p) => p.id)))
    }
  }

  const handleSubmit = () => {
    setError('')
    if (!paidBy || !amountNum || !description.trim() || participantIds.size === 0)
      return

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

    if (editing) {
      onUpdate?.(
        editing.expense.id,
        paidBy,
        amountNum,
        description.trim(),
        splitType,
        result.participants,
      )
    } else {
      onSubmit(paidBy, amountNum, description.trim(), splitType, result.participants)
    }
    onClose()
  }

  const canSubmit =
    paidBy &&
    amountNum > 0 &&
    description.trim() &&
    participantIds.size > 0 &&
    (splitType !== 'custom_split' || customSum === amountNum)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-text-secondary mb-2">{t.expenses.whoPaid}</p>
        <div className="flex flex-wrap gap-2">
          {formPlayers.map((p) => (
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
        <p className="text-sm text-text-secondary mb-2">
          {t.expenses.whoParticipates}
        </p>
        <div className="flex flex-wrap gap-2">
          {formPlayers.map((p) => (
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
              const player = formPlayers.find((p) => p.id === id)
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

      {(error || externalError) && (
        <p className="text-sm text-negative">{error || externalError}</p>
      )}

      <Button fullWidth onClick={handleSubmit} disabled={!canSubmit}>
        {editing ? t.expenses.saveChanges : t.expenses.saveExpense}
      </Button>

      {editing && onDelete && (
        <Button
          variant="danger"
          fullWidth
          onClick={() => setConfirmDelete(true)}
        >
          {t.expenses.deleteExpense}
        </Button>
      )}

      {editing && onDelete && (
        <ConfirmSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={t.expenses.deleteExpenseTitle}
          message={t.expenses.deleteExpenseWarning}
          confirmLabel={t.expenses.deleteExpenseConfirm}
          cancelLabel={t.common.cancel}
          onConfirm={async () => {
            // The parent owns both sheets' open state and closes them
            // once the delete is dispatched, so this does not close here.
            onDelete(editing.expense.id)
          }}
        />
      )}
    </div>
  )
}
