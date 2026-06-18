import { describe, it, expect } from 'vitest'
import { calcAllPlayerBalances } from './balance'
import { calcSettlements } from './settlement'
import { validateGameForClose } from './validation'
import type {
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// These tests mirror the server-side recomputation closeGameAction performs
// after the C1 fix. The server fetches buy-ins / expenses fresh, validates,
// then calls calcAllPlayerBalances + calcSettlements. Anything that breaks
// this end-to-end flow would corrupt history and stats.
// ---------------------------------------------------------------------------

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

describe('server-side close recompute (C1)', () => {
  it('validates, computes, and settles a balanced two-player game', () => {
    const playerIds = ['roi', 'tamar']
    const buyIns = [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)]
    const cashOuts = [makeCashOut('roi', 150), makeCashOut('tamar', 50)]

    const validation = validateGameForClose(
      playerIds,
      buyIns,
      cashOuts,
      [],
      new Map(),
    )
    expect(validation.valid).toBe(true)

    const results = calcAllPlayerBalances(
      playerIds,
      buyIns,
      cashOuts,
      [],
      new Map(),
      'g1',
    )
    expect(results.find((r) => r.player_id === 'roi')?.final_balance).toBe(50)
    expect(results.find((r) => r.player_id === 'tamar')?.final_balance).toBe(-50)
    expect(results.reduce((s, r) => s + r.final_balance, 0)).toBe(0)

    const settlements = calcSettlements(
      results.map((r) => ({ playerId: r.player_id, amount: r.final_balance })),
    )
    expect(settlements).toEqual([{ from: 'tamar', to: 'roi', amount: 50 }])
  })

  it('rejects close attempts where cash-outs do not equal buy-ins', () => {
    const validation = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 200), makeCashOut('tamar', 200)],
      [],
      new Map(),
    )
    expect(validation.valid).toBe(false)
    expect(
      validation.errors.some((e) => e.code === 'cash_outs_must_equal_buy_ins'),
    ).toBe(true)
  })

  it('rejects close with negative cash-out', () => {
    const validation = validateGameForClose(
      ['roi', 'tamar'],
      [makeBuyIn('roi', 100), makeBuyIn('tamar', 100)],
      [makeCashOut('roi', 300), makeCashOut('tamar', -100)],
      [],
      new Map(),
    )
    expect(validation.valid).toBe(false)
    expect(
      validation.errors.some((e) => e.code === 'negative_cash_out'),
    ).toBe(true)
  })

  it('rejects close with missing cash-out for a roster player', () => {
    // Mimics the server: roster derived from game_players ∩ players with
    // at least one buy-in. If any of those is missing a cash-out, we reject.
    const validation = validateGameForClose(
      ['roi', 'tamar', 'amit'],
      [
        makeBuyIn('roi', 100),
        makeBuyIn('tamar', 100),
        makeBuyIn('amit', 100),
      ],
      [makeCashOut('roi', 150), makeCashOut('tamar', 150)],
      [],
      new Map(),
    )
    expect(validation.valid).toBe(false)
    expect(
      validation.errors.some(
        (e) => e.code === 'missing_cash_out' && e.params?.playerId === 'amit',
      ),
    ).toBe(true)
  })

  it('handles equal-split food expense with rounding remainder', () => {
    // 100 split between 3 players: 34, 33, 33.
    const expense: Expense = {
      id: 'exp-1',
      game_id: 'g1',
      paid_by_player_id: 'roi',
      amount: 100,
      description: 'pizza',
      split_type: 'equal_split',
      created_by: 'host',
      created_at: '',
    }
    const participants: ExpenseParticipant[] = [
      { id: '1', expense_id: 'exp-1', player_id: 'roi', amount_owed: 34 },
      { id: '2', expense_id: 'exp-1', player_id: 'tamar', amount_owed: 33 },
      { id: '3', expense_id: 'exp-1', player_id: 'amit', amount_owed: 33 },
    ]
    const map = new Map([['exp-1', participants]])

    const v = validateGameForClose(
      ['roi', 'tamar', 'amit'],
      [
        makeBuyIn('roi', 100),
        makeBuyIn('tamar', 100),
        makeBuyIn('amit', 100),
      ],
      [
        makeCashOut('roi', 100),
        makeCashOut('tamar', 100),
        makeCashOut('amit', 100),
      ],
      [expense],
      map,
    )
    expect(v.valid).toBe(true)

    const results = calcAllPlayerBalances(
      ['roi', 'tamar', 'amit'],
      [
        makeBuyIn('roi', 100),
        makeBuyIn('tamar', 100),
        makeBuyIn('amit', 100),
      ],
      [
        makeCashOut('roi', 100),
        makeCashOut('tamar', 100),
        makeCashOut('amit', 100),
      ],
      [expense],
      map,
      'g1',
    )

    // Sum of final balances should be zero (or within ±1 of rounding).
    const total = results.reduce((s, r) => s + r.final_balance, 0)
    expect(Math.abs(total)).toBeLessThanOrEqual(1)
  })

  it('produces no settlements when everyone broke even', () => {
    const settlements = calcSettlements([
      { playerId: 'roi', amount: 0 },
      { playerId: 'tamar', amount: 0 },
      { playerId: 'amit', amount: 0 },
    ])
    expect(settlements).toEqual([])
  })

  it('handles a single-player edge case (PRD-illegal but defensive)', () => {
    // The validation layer will reject this (need ≥ 2 players to settle).
    // calcSettlements alone should still not crash and should return [].
    expect(calcSettlements([{ playerId: 'roi', amount: 0 }])).toEqual([])
  })
})

describe('settlement defensiveness against tampered inputs', () => {
  it('ignores zero-amount balances', () => {
    const settlements = calcSettlements([
      { playerId: 'roi', amount: 100 },
      { playerId: 'tamar', amount: 0 },
      { playerId: 'amit', amount: -100 },
    ])
    expect(settlements).toEqual([{ from: 'amit', to: 'roi', amount: 100 }])
  })

  it('keeps every transfer strictly positive', () => {
    const settlements = calcSettlements([
      { playerId: 'a', amount: 150 },
      { playerId: 'b', amount: -50 },
      { playerId: 'c', amount: -100 },
    ])
    for (const t of settlements) {
      expect(t.amount).toBeGreaterThan(0)
    }
  })
})
