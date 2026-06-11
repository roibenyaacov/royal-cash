import { describe, it, expect } from 'vitest'
import { parseRangeString } from './preflop-range-parser'
import { PREFLOP_CHARTS, getHandKey } from './preflop-data'

function gridHasRaise(hand: string, position: keyof typeof PREFLOP_CHARTS): boolean {
  const grid = PREFLOP_CHARTS[position]
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      if (getHandKey(i, j) === hand) {
        return grid[i][j] === 'R'
      }
    }
  }
  return false
}

describe('parseRangeString', () => {
  it('parses pair+ notation', () => {
    const hands = parseRangeString('77+')
    expect(hands['77']).toBe('R')
    expect(hands['AA']).toBe('R')
    expect(hands['66']).toBeUndefined()
  })

  it('parses suited+ notation', () => {
    const hands = parseRangeString('ATs+')
    expect(hands['ATs']).toBe('R')
    expect(hands['AKs']).toBe('R')
    expect(hands['A9s']).toBeUndefined()
  })

  it('parses all suited aces', () => {
    const hands = parseRangeString('A2s+')
    expect(hands['A2s']).toBe('R')
    expect(hands['AKs']).toBe('R')
    expect(hands['KQs']).toBeUndefined()
  })

  it('parses offsuit+ notation', () => {
    const hands = parseRangeString('AQo+')
    expect(hands['AQo']).toBe('R')
    expect(hands['AKo']).toBe('R')
    expect(hands['AJo']).toBeUndefined()
  })

  it('parses exact combos', () => {
    const hands = parseRangeString('JTs, T9s, KQo')
    expect(hands['JTs']).toBe('R')
    expect(hands['T9s']).toBe('R')
    expect(hands['KQo']).toBe('R')
  })
})

describe('UTG 8-max RFI chart', () => {
  it('raises 77+ and folds 66', () => {
    expect(gridHasRaise('77', 'UTG')).toBe(true)
    expect(gridHasRaise('66', 'UTG')).toBe(false)
  })

  it('raises ATs+ but not A9s', () => {
    expect(gridHasRaise('ATs', 'UTG')).toBe(true)
    expect(gridHasRaise('A9s', 'UTG')).toBe(false)
  })

  it('raises AQo+ but not AJo', () => {
    expect(gridHasRaise('AQo', 'UTG')).toBe(true)
    expect(gridHasRaise('AJo', 'UTG')).toBe(false)
  })
})

describe('BTN 8-max RFI chart', () => {
  it('raises wide suited and A2o+', () => {
    expect(gridHasRaise('72s', 'BTN')).toBe(false)
    expect(gridHasRaise('A2o', 'BTN')).toBe(true)
    expect(gridHasRaise('T9o', 'BTN')).toBe(true)
  })
})
