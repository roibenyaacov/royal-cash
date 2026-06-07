import { describe, it, expect } from 'vitest'
import { calcGameNet, calcFinalBalance, calcAllPlayerBalances } from './balance'
import type { BuyIn, CashOut, Expense, ExpenseParticipant } from '@/lib/domain/types'

describe('calcGameNet', () => {
  it('calculates cash-out minus buy-in (PRD example)', () => {
    expect(calcGameNet(450, 300)).toBe(150)
  })

  it('handles loss', () => {
    expect(calcGameNet(100, 300)).toBe(-200)
  })
})

describe('calcFinalBalance', () => {
  it('calculates payer balance with food reimbursement (no self-debt)', () => {
    expect(calcFinalBalance(450, 300, 250, 0)).toBe(400)
  })

  it('calculates participant food debt owed to payer', () => {
    expect(calcFinalBalance(100, 100, 0, 50)).toBe(-50)
  })
})

describe('calcAllPlayerBalances', () => {
  it('calculates balances for multiple players', () => {
    const buyIns: BuyIn[] = [
      { id: '1', game_id: 'g1', player_id: 'roi', amount: 300, created_by: 'h', created_at: '', note: null },
      { id: '2', game_id: 'g1', player_id: 'tamar', amount: 200, created_by: 'h', created_at: '', note: null },
      { id: '3', game_id: 'g1', player_id: 'amit', amount: 100, created_by: 'h', created_at: '', note: null },
    ]

    const cashOuts: CashOut[] = [
      { id: '1', game_id: 'g1', player_id: 'roi', amount: 450, created_by: 'h', created_at: '', updated_at: '' },
      { id: '2', game_id: 'g1', player_id: 'tamar', amount: 100, created_by: 'h', created_at: '', updated_at: '' },
      { id: '3', game_id: 'g1', player_id: 'amit', amount: 50, created_by: 'h', created_at: '', updated_at: '' },
    ]

    const expenses: Expense[] = []
    const participantsByExpense = new Map<string, ExpenseParticipant[]>()

    const results = calcAllPlayerBalances(
      ['roi', 'tamar', 'amit'],
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
      'g1',
    )

    expect(results).toHaveLength(3)

    const roi = results.find((r) => r.player_id === 'roi')!
    expect(roi.total_buy_in).toBe(300)
    expect(roi.cash_out).toBe(450)
    expect(roi.game_net).toBe(150)
    expect(roi.final_balance).toBe(150)

    const tamar = results.find((r) => r.player_id === 'tamar')!
    expect(tamar.final_balance).toBe(-100)

    const amit = results.find((r) => r.player_id === 'amit')!
    expect(amit.final_balance).toBe(-50)

    const total = results.reduce((s, r) => s + r.final_balance, 0)
    expect(total).toBe(0)
  })

  it('balances food expenses across all players', () => {
    const buyIns: BuyIn[] = [
      { id: '1', game_id: 'g1', player_id: 'roi', amount: 400, created_by: 'h', created_at: '', note: null },
      { id: '2', game_id: 'g1', player_id: 'tamar', amount: 400, created_by: 'h', created_at: '', note: null },
      { id: '3', game_id: 'g1', player_id: 'amit', amount: 400, created_by: 'h', created_at: '', note: null },
      { id: '4', game_id: 'g1', player_id: 'dana', amount: 400, created_by: 'h', created_at: '', note: null },
    ]

    const cashOuts: CashOut[] = [
      { id: '1', game_id: 'g1', player_id: 'roi', amount: 700, created_by: 'h', created_at: '', updated_at: '' },
      { id: '2', game_id: 'g1', player_id: 'tamar', amount: 300, created_by: 'h', created_at: '', updated_at: '' },
      { id: '3', game_id: 'g1', player_id: 'amit', amount: 300, created_by: 'h', created_at: '', updated_at: '' },
      { id: '4', game_id: 'g1', player_id: 'dana', amount: 300, created_by: 'h', created_at: '', updated_at: '' },
    ]

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        game_id: 'g1',
        paid_by_player_id: 'roi',
        amount: 400,
        description: 'אוכל',
        split_type: 'equal_split',
        created_by: 'h',
        created_at: '',
      },
    ]

    const participantsByExpense = new Map<string, ExpenseParticipant[]>([
      [
        'exp-1',
        [
          { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 100 },
          { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 100 },
          { id: '3', expense_id: 'exp-1', player_id: 'amit', amount_owed: 100 },
          { id: '4', expense_id: 'exp-1', player_id: 'dana', amount_owed: 100 },
        ],
      ],
    ])

    const results = calcAllPlayerBalances(
      ['roi', 'tamar', 'amit', 'dana'],
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
      'g1',
    )

    const roi = results.find((r) => r.player_id === 'roi')!
    expect(roi.game_net).toBe(300)
    expect(roi.expense_credit).toBe(300)
    expect(roi.expense_debt).toBe(100)
    expect(roi.final_balance).toBe(600)

    const tamar = results.find((r) => r.player_id === 'tamar')!
    expect(tamar.game_net).toBe(-100)
    expect(tamar.final_balance).toBe(-200)

    const total = results.reduce((s, r) => s + r.final_balance, 0)
    expect(total).toBe(0)
  })
})
