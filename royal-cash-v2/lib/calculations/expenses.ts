import type { Expense, ExpenseParticipant } from '@/lib/domain/types'

/**
 * How much credit a player earned by paying for others.
 * Credit = sum of shares owed by other active participants.
 */
export function calcExpenseCredit(
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
  playerId: string,
  activePlayerIds?: Set<string>,
): number {
  let credit = 0

  for (const expense of expenses) {
    if (expense.paid_by_player_id !== playerId) continue

    const participants = participantsByExpense.get(expense.id) ?? []
    for (const p of participants) {
      if (p.player_id === playerId) continue
      if (activePlayerIds && !activePlayerIds.has(p.player_id)) continue
      credit += p.amount_owed
    }
  }

  return credit
}

/**
 * Total share a player consumed across all expenses (for display).
 */
export function calcExpenseDebt(
  participantsByExpense: Map<string, ExpenseParticipant[]>,
  playerId: string,
): number {
  let debt = 0

  for (const participants of participantsByExpense.values()) {
    for (const p of participants) {
      if (p.player_id === playerId) {
        debt += p.amount_owed
      }
    }
  }

  return debt
}

/**
 * How much a player owes to other players for expenses they did not pay.
 * A payer does not owe themselves for an expense they covered.
 */
export function calcExpenseDebtPayable(
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
  playerId: string,
  activePlayerIds?: Set<string>,
): number {
  let debt = 0

  for (const expense of expenses) {
    if (expense.paid_by_player_id === playerId) continue

    const participants = participantsByExpense.get(expense.id) ?? []
    for (const p of participants) {
      if (p.player_id !== playerId) continue
      if (activePlayerIds && !activePlayerIds.has(playerId)) continue
      debt += p.amount_owed
    }
  }

  return debt
}

/** Total amount a player paid for food/expenses (what they ordered). */
export function calcExpenseTotalPaid(
  expenses: Expense[],
  playerId: string,
): number {
  return expenses
    .filter((e) => e.paid_by_player_id === playerId)
    .reduce((sum, e) => sum + e.amount, 0)
}
