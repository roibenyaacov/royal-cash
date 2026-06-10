import { describe, it, expect } from 'vitest'
import { validateGameForClose } from './validation'
import type { BuyIn, CashOut, Expense, ExpenseParticipant } from '@/lib/domain/types'

const makeBuyIn = (playerId: string, amount: number): BuyIn => ({
  id: crypto.randomUUID(),
  game_id: 'g1',
  player_id: playerId,
  amount,
  created_by: 'host',
  created_at: '',
  note: null,
})

const makeCashOut = (playerId: string, amount: number): CashOut => ({
  id: crypto.randomUUID(),
  game_id: 'g1',
  player_id: playerId,
  amount,
  created_by: 'host',
  created_at: '',
  updated_at: '',
})

describe('validateGameForClose', () => {
  it('passes for a valid balanced game', () => {
    const result = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 150), makeCashOut('tamar', 50)],
      [],
      new Map(),
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when a player is missing cash-out', () => {
    const result = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 200)],
      [],
      new Map(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'missing_cash_out' && e.params?.playerId === 'tamar')).toBe(
      true,
    )
  })

  it('allows zero total buy-in for a player with zero cash-out', () => {
    const result = validateGameForClose(
      ['roi', 'guest'],
      [makeBuyIn('roi', 100)],
      [makeCashOut('roi', 100), makeCashOut('guest', 0)],
      [],
      new Map(),
    )
    expect(result.valid).toBe(true)
  })

  it('fails when buy-in is negative', () => {
    const result = validateGameForClose(
      ['roi'],
      [makeBuyIn('roi', -10)],
      [makeCashOut('roi', 0)],
      [],
      new Map(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'buy_in_not_positive')).toBe(true)
  })

  it('fails when expense splits do not match total', () => {
    const expense: Expense = {
      id: 'exp-1',
      game_id: 'g1',
      paid_by_player_id: 'roi',
      amount: 100,
      description: 'Pizza',
      split_type: 'equal_split',
      created_by: 'host',
      created_at: '',
    }
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 30 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 30 },
    ]

    const result = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 150), makeCashOut('tamar', 50)],
      [expense],
      new Map([['exp-1', participants]]),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'expense_splits_mismatch')).toBe(true)
  })

  it('fails when cash-outs do not equal buy-ins', () => {
    const result = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 200), makeCashOut('tamar', 200)],
      [],
      new Map(),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'cash_outs_must_equal_buy_ins')).toBe(true)
  })

  it('passes with personal expense', () => {
    const expense: Expense = {
      id: 'exp-1',
      game_id: 'g1',
      paid_by_player_id: 'roi',
      amount: 80,
      description: 'Beer',
      split_type: 'personal',
      created_by: 'host',
      created_at: '',
    }
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 80 },
    ]

    const result = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 180), makeCashOut('tamar', 20)],
      [expense],
      new Map([['exp-1', participants]]),
    )
    expect(result.valid).toBe(true)
  })

  it('passes for a balanced game with food expense', () => {
    const expense: Expense = {
      id: 'exp-1',
      game_id: 'g1',
      paid_by_player_id: 'roi',
      amount: 400,
      description: 'אוכל',
      split_type: 'equal_split',
      created_by: 'host',
      created_at: '',
    }
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 100 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 100 },
      { id: '3', expense_id: 'exp-1', player_id: 'amit', amount_owed: 100 },
      { id: '4', expense_id: 'exp-1', player_id: 'dana', amount_owed: 100 },
    ]

    const result = validateGameForClose(
      ['roi', 'tamar', 'amit', 'dana'],
      [
        makeBuyIn('roi', 400),
        makeBuyIn('tamar', 400),
        makeBuyIn('amit', 400),
        makeBuyIn('dana', 400),
      ],
      [
        makeCashOut('roi', 400),
        makeCashOut('tamar', 400),
        makeCashOut('amit', 400),
        makeCashOut('dana', 400),
      ],
      [expense],
      new Map([['exp-1', participants]]),
    )

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
