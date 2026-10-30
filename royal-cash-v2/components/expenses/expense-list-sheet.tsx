'use client'

import { useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Card } from '@/components/ui/card'
import { ChevronForward } from '@/components/ui/chevron'
import { useLocale } from '@/lib/i18n/locale-context'
import type {
  Currency,
  Expense,
  ExpenseParticipant,
  Player,
} from '@/lib/domain/types'

type ExpenseListSheetProps = {
  open: boolean
  onClose: () => void
  expenses: Expense[]
  participants: ExpenseParticipant[]
  players: Player[]
  currency: Currency
  /** Omitted for spectators / a read-only view: rows render untappable. */
  onSelect?: (expenseId: string) => void
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  )
}

export function ExpenseListSheet({
  open,
  onClose,
  expenses,
  participants,
  players,
  currency,
  onSelect,
}: ExpenseListSheetProps) {
  const { dir } = useLocale()
  const symbol = t.currency[currency]

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const countByExpense = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of participants) {
      counts.set(p.expense_id, (counts.get(p.expense_id) ?? 0) + 1)
    }
    return counts
  }, [participants])

  return (
    <BottomSheet open={open} onClose={onClose} title={t.expenses.listTitle}>
      {expenses.length === 0 ? (
        <p className="text-sm text-text-muted">{t.expenses.noExpenses}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {onSelect && (
            <p className="text-xs text-text-muted mb-1">
              {t.expenses.editHint}
            </p>
          )}
          {expenses.map((expense) => {
            const payer =
              playerNames.get(expense.paid_by_player_id) ??
              t.game.unknownPlayer
            const count = countByExpense.get(expense.id) ?? 0
            const row = (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {expense.description || t.expenses.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {fill(t.expenses.paidBy, { name: payer })}
                    {count > 0
                      ? ` · ${fill(t.expenses.splitAmong, { count })}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-sm font-semibold text-text-primary"
                    dir="ltr"
                  >
                    {symbol}
                    {expense.amount}
                  </span>
                  {onSelect && (
                    <ChevronForward
                      className={`opacity-40 ${
                        dir === 'ltr' ? 'scale-x-[-1]' : ''
                      }`}
                    />
                  )}
                </div>
              </div>
            )

            return onSelect ? (
              <button
                key={expense.id}
                type="button"
                onClick={() => onSelect(expense.id)}
                className="text-start w-full rounded-[var(--radius-card)]
                  active:bg-surface-elevated/60 transition-colors"
              >
                <Card className="py-3">{row}</Card>
              </button>
            ) : (
              <Card key={expense.id} className="py-3">
                {row}
              </Card>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}
