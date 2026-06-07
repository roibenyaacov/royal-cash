import type {
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
  GameResult,
} from '@/lib/domain/types'
import { calcPlayerBuyIns } from './buy-ins'
import {
  calcExpenseCredit,
  calcExpenseDebt,
  calcExpenseDebtPayable,
} from './expenses'

export function calcGameNet(cashOut: number, totalBuyIn: number): number {
  return cashOut - totalBuyIn
}

export function calcFinalBalance(
  cashOut: number,
  totalBuyIn: number,
  expenseCredit: number,
  expenseDebtPayable: number,
): number {
  return cashOut - totalBuyIn + expenseCredit - expenseDebtPayable
}

export function calcAllPlayerBalances(
  playerIds: string[],
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
  gameId: string,
): Omit<GameResult, 'id' | 'created_at'>[] {
  const cashOutMap = new Map(cashOuts.map((c) => [c.player_id, c.amount]))
  const activePlayerIds = new Set(playerIds)

  return playerIds.map((playerId) => {
    const totalBuyIn = calcPlayerBuyIns(buyIns, playerId)
    const cashOut = cashOutMap.get(playerId) ?? 0
    const gameNet = calcGameNet(cashOut, totalBuyIn)
    const expenseCredit = calcExpenseCredit(
      expenses,
      participantsByExpense,
      playerId,
      activePlayerIds,
    )
    const expenseDebt = calcExpenseDebt(participantsByExpense, playerId)
    const expenseDebtPayable = calcExpenseDebtPayable(
      expenses,
      participantsByExpense,
      playerId,
      activePlayerIds,
    )
    const finalBalance = calcFinalBalance(
      cashOut,
      totalBuyIn,
      expenseCredit,
      expenseDebtPayable,
    )

    return {
      game_id: gameId,
      player_id: playerId,
      total_buy_in: totalBuyIn,
      cash_out: cashOut,
      game_net: gameNet,
      expense_credit: expenseCredit,
      expense_debt: expenseDebt,
      final_balance: finalBalance,
    }
  })
}
