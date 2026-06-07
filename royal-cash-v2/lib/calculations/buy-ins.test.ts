import { describe, it, expect } from 'vitest'
import { calcTotalBuyIn, calcPlayerBuyIns } from './buy-ins'
import type { BuyIn } from '@/lib/domain/types'

const stub = (overrides: Partial<BuyIn> & { player_id: string; amount: number }): BuyIn => ({
  id: crypto.randomUUID(),
  game_id: 'game-1',
  created_by: 'host',
  created_at: new Date().toISOString(),
  note: null,
  ...overrides,
})

describe('calcTotalBuyIn', () => {
  it('sums all buy-in amounts', () => {
    const buyIns = [
      stub({ player_id: 'roi', amount: 100 }),
      stub({ player_id: 'roi', amount: 200 }),
      stub({ player_id: 'roi', amount: 100 }),
    ]
    expect(calcTotalBuyIn(buyIns)).toBe(400)
  })

  it('returns 0 for empty array', () => {
    expect(calcTotalBuyIn([])).toBe(0)
  })
})

describe('calcPlayerBuyIns', () => {
  it('filters by player and sums', () => {
    const buyIns = [
      stub({ player_id: 'roi', amount: 100 }),
      stub({ player_id: 'roi', amount: 200 }),
      stub({ player_id: 'tamar', amount: 100 }),
    ]
    expect(calcPlayerBuyIns(buyIns, 'roi')).toBe(300)
    expect(calcPlayerBuyIns(buyIns, 'tamar')).toBe(100)
    expect(calcPlayerBuyIns(buyIns, 'unknown')).toBe(0)
  })
})
