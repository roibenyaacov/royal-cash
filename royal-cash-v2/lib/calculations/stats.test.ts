import { describe, it, expect } from 'vitest'
import { calcAveragePerGame, calcWinRatePercent } from './stats'

describe('calcAveragePerGame', () => {
  it('returns rounded average', () => {
    expect(calcAveragePerGame(350, 3)).toBe(117)
    expect(calcAveragePerGame(-200, 4)).toBe(-50)
  })

  it('returns 0 when no games', () => {
    expect(calcAveragePerGame(100, 0)).toBe(0)
  })
})

describe('calcWinRatePercent', () => {
  it('returns rounded win rate', () => {
    expect(calcWinRatePercent(2, 4)).toBe(50)
    expect(calcWinRatePercent(1, 3)).toBe(33)
  })

  it('returns 0 when no games', () => {
    expect(calcWinRatePercent(0, 0)).toBe(0)
  })
})
