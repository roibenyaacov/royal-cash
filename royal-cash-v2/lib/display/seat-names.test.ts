import { describe, it, expect } from 'vitest'
import { resolveSeatNames } from './seat-names'

describe('resolveSeatNames', () => {
  it('uses the first name when it is unique', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'Roi Ben Yaacov' },
      { id: 'b', name: 'Tamar Levi' },
    ])
    expect(names.get('a')).toBe('Roi')
    expect(names.get('b')).toBe('Tamar')
  })

  it('handles Hebrew names', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'רועי בן יעקב' },
      { id: 'b', name: 'תמר לוי' },
    ])
    expect(names.get('a')).toBe('רועי')
    expect(names.get('b')).toBe('תמר')
  })

  it('keeps single-token names as-is', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'אדיר' },
      { id: 'b', name: 'בנאי' },
    ])
    expect(names.get('a')).toBe('אדיר')
    expect(names.get('b')).toBe('בנאי')
  })

  it('adds the surname initial when first names collide', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'דני כהן' },
      { id: 'b', name: 'דני לוי' },
      { id: 'c', name: 'אורי מזרחי' },
    ])
    expect(names.get('a')).toBe('דני כ.')
    expect(names.get('b')).toBe('דני ל.')
    expect(names.get('c')).toBe('אורי')
  })

  it('treats first names as colliding regardless of case', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'Dani Cohen' },
      { id: 'b', name: 'dani Levi' },
    ])
    expect(names.get('a')).toBe('Dani C.')
    expect(names.get('b')).toBe('dani L.')
  })

  it('falls back to the full name when the initial still collides', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'דני כהן' },
      { id: 'b', name: 'דני כץ' },
    ])
    expect(names.get('a')).toBe('דני כהן')
    expect(names.get('b')).toBe('דני כץ')
  })

  it('keeps the full name when a colliding entry has no surname', () => {
    const names = resolveSeatNames([
      { id: 'a', name: 'דני' },
      { id: 'b', name: 'דני לוי' },
    ])
    // 'a' has nothing to disambiguate with, so both stay distinguishable:
    // 'a' keeps the bare first name, 'b' gains the initial.
    expect(names.get('a')).toBe('דני')
    expect(names.get('b')).toBe('דני ל.')
  })

  it('collapses extra whitespace', () => {
    const names = resolveSeatNames([{ id: 'a', name: '  Roi   Ben  Yaacov ' }])
    expect(names.get('a')).toBe('Roi')
  })

  it('returns a placeholder for an empty name', () => {
    const names = resolveSeatNames([{ id: 'a', name: '   ' }])
    expect(names.get('a')).toBe('?')
  })

  it('returns an entry for every seat', () => {
    const seats = [
      { id: 'a', name: 'Roi' },
      { id: 'b', name: '' },
      { id: 'c', name: 'Tamar Levi' },
    ]
    const names = resolveSeatNames(seats)
    expect(names.size).toBe(3)
    for (const seat of seats) {
      expect(names.has(seat.id)).toBe(true)
    }
  })

  it('handles an empty seat list', () => {
    expect(resolveSeatNames([]).size).toBe(0)
  })
})
