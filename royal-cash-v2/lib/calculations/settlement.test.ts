import { describe, it, expect } from 'vitest'
import { calcSettlements } from './settlement'

describe('calcSettlements', () => {
  it('handles PRD example: Roi +150, Tamar -100, Amit -50', () => {
    const settlements = calcSettlements([
      { playerId: 'roi', amount: 150 },
      { playerId: 'tamar', amount: -100 },
      { playerId: 'amit', amount: -50 },
    ])

    expect(settlements).toHaveLength(2)

    expect(settlements).toContainEqual({ from: 'tamar', to: 'roi', amount: 100 })
    expect(settlements).toContainEqual({ from: 'amit', to: 'roi', amount: 50 })
  })

  it('handles case where one debtor pays multiple creditors', () => {
    const settlements = calcSettlements([
      { playerId: 'a', amount: 100 },
      { playerId: 'b', amount: 50 },
      { playerId: 'c', amount: -150 },
    ])

    expect(settlements).toHaveLength(2)

    const totalPaid = settlements
      .filter((s) => s.from === 'c')
      .reduce((s, t) => s + t.amount, 0)
    expect(totalPaid).toBe(150)
  })

  it('handles balanced game (no settlements)', () => {
    const settlements = calcSettlements([
      { playerId: 'a', amount: 0 },
      { playerId: 'b', amount: 0 },
    ])
    expect(settlements).toHaveLength(0)
  })

  it('handles single transfer', () => {
    const settlements = calcSettlements([
      { playerId: 'a', amount: 100 },
      { playerId: 'b', amount: -100 },
    ])
    expect(settlements).toEqual([{ from: 'b', to: 'a', amount: 100 }])
  })

  it('handles complex multi-player scenario', () => {
    const settlements = calcSettlements([
      { playerId: 'a', amount: 200 },
      { playerId: 'b', amount: 100 },
      { playerId: 'c', amount: -120 },
      { playerId: 'd', amount: -80 },
      { playerId: 'e', amount: -100 },
    ])

    const totalFrom = settlements.reduce((s, t) => s + t.amount, 0)
    expect(totalFrom).toBe(300)

    for (const s of settlements) {
      expect(s.amount).toBeGreaterThan(0)
    }
  })
})
