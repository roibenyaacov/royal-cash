import type {
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'
import { calcPlayerBuyIns } from './buy-ins'
import { calcAllPlayerBalances } from './balance'

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateGameForClose(
  playerIds: string[],
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
): ValidationResult {
  const errors: string[] = []
  const playerIdSet = new Set(playerIds)

  const cashOutPlayerIds = new Set(cashOuts.map((c) => c.player_id))
  for (const pid of playerIds) {
    if (!cashOutPlayerIds.has(pid)) {
      errors.push(`Player ${pid} is missing a cash-out value`)
    }
  }

  for (const co of cashOuts) {
    if (co.amount < 0) {
      errors.push(`Player ${co.player_id} has a negative cash-out`)
    }
  }

  for (const bi of buyIns) {
    if (bi.amount <= 0) {
      errors.push(`Buy-in for player ${bi.player_id} must be positive`)
    }
    if (!playerIdSet.has(bi.player_id)) {
      errors.push(
        `Buy-in for player ${bi.player_id} is not in the game roster`,
      )
    }
  }

  for (const exp of expenses) {
    if (exp.amount <= 0) {
      errors.push(`Expense "${exp.description}" must have a positive amount`)
    }

    if (!playerIdSet.has(exp.paid_by_player_id)) {
      errors.push(
        `Expense "${exp.description}" was paid by a player not in this game`,
      )
    }

    const participants = participantsByExpense.get(exp.id) ?? []
    const totalOwed = participants.reduce((s, p) => s + p.amount_owed, 0)
    if (totalOwed !== exp.amount) {
      errors.push(
        `Expense "${exp.description}" splits (${totalOwed}) do not match total (${exp.amount})`,
      )
    }

    for (const p of participants) {
      if (!playerIdSet.has(p.player_id)) {
        errors.push(
          `Expense "${exp.description}" includes a player not in this game`,
        )
        break
      }
    }
  }

  if (errors.length === 0) {
    const totalBuyIn = playerIds.reduce(
      (s, id) => s + calcPlayerBuyIns(buyIns, id),
      0,
    )
    const totalCashOut = cashOuts.reduce((s, c) => s + c.amount, 0)
    if (totalCashOut !== totalBuyIn) {
      errors.push(
        `Total cash-outs (${totalCashOut}) must equal total buy-ins (${totalBuyIn})`,
      )
    }
  }

  if (errors.length === 0) {
    const balances = calcAllPlayerBalances(
      playerIds,
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
      '',
    )
    const totalBalance = balances.reduce((s, b) => s + b.final_balance, 0)
    if (Math.abs(totalBalance) > 1) {
      errors.push(
        `Final balances do not sum to zero (difference: ${totalBalance})`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}
