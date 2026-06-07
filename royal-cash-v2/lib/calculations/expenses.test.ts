import { describe, it, expect } from 'vitest'
import { calcExpenseCredit, calcExpenseDebt, calcExpenseDebtPayable, calcExpenseTotalPaid } from './expenses'
import type { Expense, ExpenseParticipant } from '@/lib/domain/types'

function makeExpense(overrides: Partial<Expense> & { id: string; paid_by_player_id: string; amount: number }): Expense {
  return {
    game_id: 'game-1',
    description: 'Food',
    split_type: 'equal_split',
    created_by: 'host',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('calcExpenseCredit', () => {
  it('calculates credit for the payer (PRD example: food 300, 6 players)', () => {
    const expense = makeExpense({ id: 'exp-1', paid_by_player_id: 'roi', amount: 300 })

    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 50 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 50 },
      { id: '3', expense_id: 'exp-1', player_id: 'amit', amount_owed: 50 },
      { id: '4', expense_id: 'exp-1', player_id: 'dana', amount_owed: 50 },
      { id: '5', expense_id: 'exp-1', player_id: 'yael', amount_owed: 50 },
      { id: '6', expense_id: 'exp-1', player_id: 'omer', amount_owed: 50 },
    ]

    const map = new Map([['exp-1', participants]])

    expect(calcExpenseCredit([expense], map, 'roi')).toBe(250)
  })

  it('returns 0 for a player who did not pay', () => {
    const expense = makeExpense({ id: 'exp-1', paid_by_player_id: 'roi', amount: 300 })
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 50 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 50 },
    ]
    const map = new Map([['exp-1', participants]])

    expect(calcExpenseCredit([expense], map, 'tamar')).toBe(0)
  })
})

describe('calcExpenseDebt', () => {
  it('sums all shares for a player across expenses', () => {
    const participants1: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 50 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 50 },
    ]
    const participants2: ExpenseParticipant[] = [
      { id: '3', expense_id: 'exp-2', player_id: 'roi', amount_owed: 30 },
      { id: '4', expense_id: 'exp-2', player_id: 'tamar', amount_owed: 30 },
    ]
    const map = new Map([
      ['exp-1', participants1],
      ['exp-2', participants2],
    ])

    expect(calcExpenseDebt(map, 'roi')).toBe(80)
    expect(calcExpenseDebt(map, 'tamar')).toBe(80)
    expect(calcExpenseDebt(map, 'unknown')).toBe(0)
  })
})

describe('calcExpenseDebtPayable', () => {
  it('excludes debt on expenses the player paid', () => {
    const expense = makeExpense({ id: 'exp-1', paid_by_player_id: 'roi', amount: 300 })
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 50 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 50 },
    ]
    const map = new Map([['exp-1', participants]])

    expect(calcExpenseDebtPayable([expense], map, 'roi')).toBe(0)
    expect(calcExpenseDebtPayable([expense], map, 'tamar')).toBe(50)
  })

  it('ignores participants not in the active game roster', () => {
    const expense = makeExpense({ id: 'exp-1', paid_by_player_id: 'roi', amount: 400 })
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 80 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 80 },
      { id: '3', expense_id: 'exp-1', player_id: 'amit', amount_owed: 80 },
      { id: '4', expense_id: 'exp-1', player_id: 'dana', amount_owed: 80 },
      { id: '5', expense_id: 'exp-1', player_id: 'yael', amount_owed: 80 },
    ]
    const map = new Map([['exp-1', participants]])
    const active = new Set(['roi', 'tamar', 'amit', 'dana'])

    expect(calcExpenseCredit([expense], map, 'roi', active)).toBe(240)
    expect(calcExpenseDebtPayable([expense], map, 'tamar', active)).toBe(80)
  })
})

describe('calcExpenseTotalPaid', () => {
  it('sums all expenses paid by a player', () => {
    const expenses = [
      makeExpense({ id: 'exp-1', paid_by_player_id: 'roi', amount: 300 }),
      makeExpense({ id: 'exp-2', paid_by_player_id: 'roi', amount: 75 }),
      makeExpense({ id: 'exp-3', paid_by_player_id: 'tamar', amount: 100 }),
    ]

    expect(calcExpenseTotalPaid(expenses, 'roi')).toBe(375)
    expect(calcExpenseTotalPaid(expenses, 'tamar')).toBe(100)
    expect(calcExpenseTotalPaid(expenses, 'amit')).toBe(0)
  })
})
