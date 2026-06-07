import { describe, it, expect } from 'vitest'
import { buildExpenseParticipants, sumCustomAmounts } from './expense-split'

describe('buildExpenseParticipants', () => {
  it('splits equally with remainder', () => {
    const result = buildExpenseParticipants({
      splitType: 'equal_split',
      amount: 100,
      participantIds: ['a', 'b', 'c'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.participants).toEqual([
      { playerId: 'a', amountOwed: 34 },
      { playerId: 'b', amountOwed: 33 },
      { playerId: 'c', amountOwed: 33 },
    ])
  })

  it('builds custom split when sum matches', () => {
    const result = buildExpenseParticipants({
      splitType: 'custom_split',
      amount: 100,
      participantIds: ['a', 'b'],
      customAmounts: { a: 60, b: 40 },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.participants).toEqual([
      { playerId: 'a', amountOwed: 60 },
      { playerId: 'b', amountOwed: 40 },
    ])
  })

  it('rejects custom split when sum mismatches', () => {
    const result = buildExpenseParticipants({
      splitType: 'custom_split',
      amount: 100,
      participantIds: ['a', 'b'],
      customAmounts: { a: 50, b: 40 },
    })
    expect(result).toEqual({ ok: false, error: 'split_sum_mismatch' })
  })

  it('builds personal expense for one ower', () => {
    const result = buildExpenseParticipants({
      splitType: 'personal',
      amount: 80,
      participantIds: [],
      personalOwerId: 'tamar',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.participants).toEqual([{ playerId: 'tamar', amountOwed: 80 }])
  })
})

describe('sumCustomAmounts', () => {
  it('sums parsed custom amounts', () => {
    expect(sumCustomAmounts(['a', 'b'], { a: '60', b: '40' })).toBe(100)
  })
})
