import { describe, it, expect } from 'vitest'
import { hashString, pickAvatarIndex } from './avatar'

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
  })

  it('differs for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'))
  })

  it('returns an unsigned 32-bit integer', () => {
    for (const s of ['', 'a', 'player-1', 'דני']) {
      const h = hashString(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })
})

describe('pickAvatarIndex', () => {
  it('stays within range', () => {
    for (let i = 0; i < 200; i++) {
      const idx = pickAvatarIndex(`player-${i}`, 10)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(10)
    }
  })

  it('is deterministic', () => {
    const id = 'd3b07384-d9a0-4f1e-9a1b-2c3d4e5f6a7b'
    expect(pickAvatarIndex(id, 10)).toBe(pickAvatarIndex(id, 10))
  })

  it('handles an empty seed', () => {
    const idx = pickAvatarIndex('', 10)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(10)
  })

  it('guards against a zero-length character set', () => {
    expect(pickAvatarIndex('anything', 0)).toBe(0)
  })

  it('spreads ids across the set rather than clumping on one', () => {
    const count = 10
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) {
      seen.add(pickAvatarIndex(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, count))
    }
    // Not a distribution guarantee, just a smoke test that it is not constant.
    expect(seen.size).toBeGreaterThan(count / 2)
  })
})
