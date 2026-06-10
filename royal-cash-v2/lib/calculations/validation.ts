import type {
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'
import { calcPlayerBuyIns } from './buy-ins'
import { calcAllPlayerBalances } from './balance'

export type ValidationErrorCode =
  | 'missing_cash_out'
  | 'negative_cash_out'
  | 'buy_in_not_positive'
  | 'buy_in_not_in_roster'
  | 'expense_not_positive'
  | 'expense_payer_not_in_game'
  | 'expense_splits_mismatch'
  | 'expense_participant_not_in_game'
  | 'cash_outs_must_equal_buy_ins'
  | 'balances_not_zero'

export type ValidationError = {
  code: ValidationErrorCode
  params?: Record<string, string | number>
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

export function validateGameForClose(
  playerIds: string[],
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
): ValidationResult {
  const errors: ValidationError[] = []
  const playerIdSet = new Set(playerIds)

  const cashOutPlayerIds = new Set(cashOuts.map((c) => c.player_id))
  for (const pid of playerIds) {
    if (!cashOutPlayerIds.has(pid)) {
      errors.push({ code: 'missing_cash_out', params: { playerId: pid } })
    }
  }

  for (const co of cashOuts) {
    if (co.amount < 0) {
      errors.push({
        code: 'negative_cash_out',
        params: { playerId: co.player_id },
      })
    }
  }

  for (const bi of buyIns) {
    if (bi.amount < 0) {
      errors.push({
        code: 'buy_in_not_positive',
        params: { playerId: bi.player_id },
      })
    }
    if (!playerIdSet.has(bi.player_id)) {
      errors.push({
        code: 'buy_in_not_in_roster',
        params: { playerId: bi.player_id },
      })
    }
  }

  for (const exp of expenses) {
    if (exp.amount <= 0) {
      errors.push({
        code: 'expense_not_positive',
        params: { description: exp.description },
      })
    }

    if (!playerIdSet.has(exp.paid_by_player_id)) {
      errors.push({
        code: 'expense_payer_not_in_game',
        params: { description: exp.description },
      })
    }

    const participants = participantsByExpense.get(exp.id) ?? []
    const totalOwed = participants.reduce((s, p) => s + p.amount_owed, 0)
    if (totalOwed !== exp.amount) {
      errors.push({
        code: 'expense_splits_mismatch',
        params: {
          description: exp.description,
          splits: totalOwed,
          total: exp.amount,
        },
      })
    }

    for (const p of participants) {
      if (!playerIdSet.has(p.player_id)) {
        errors.push({
          code: 'expense_participant_not_in_game',
          params: { description: exp.description },
        })
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
      errors.push({
        code: 'cash_outs_must_equal_buy_ins',
        params: { cashOuts: totalCashOut, buyIns: totalBuyIn },
      })
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
      errors.push({
        code: 'balances_not_zero',
        params: { difference: totalBalance },
      })
    }
  }

  return { valid: errors.length === 0, errors }
}
