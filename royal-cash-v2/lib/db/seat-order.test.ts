import { describe, it, expect } from 'vitest'
import { sortBySeatOrder } from './games'
import type { Player } from '@/lib/domain/types'

const player = (id: string, name: string): Player => ({
  id,
  group_id: 'g1',
  display_name: name,
  phone: null,
  linked_user_id: null,
  is_active: true,
  created_at: '',
  updated_at: '',
})

// Input arrives alphabetical, the way getGameRosterPlayers fetches it.
const alphabetical = [
  player('a', 'Amit'),
  player('b', 'Boaz'),
  player('c', 'Carmel'),
  player('d', 'Dana'),
]

const names = (players: Player[]) => players.map((p) => p.display_name)

describe('sortBySeatOrder', () => {
  it('leaves an unarranged table alphabetical', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'a', seat_order: null },
      { player_id: 'b', seat_order: null },
      { player_id: 'c', seat_order: null },
      { player_id: 'd', seat_order: null },
    ])
    expect(names(sorted)).toEqual(['Amit', 'Boaz', 'Carmel', 'Dana'])
  })

  it('applies an explicit arrangement', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'a', seat_order: 3 },
      { player_id: 'b', seat_order: 1 },
      { player_id: 'c', seat_order: 0 },
      { player_id: 'd', seat_order: 2 },
    ])
    expect(names(sorted)).toEqual(['Carmel', 'Boaz', 'Dana', 'Amit'])
  })

  it('puts players added after the arrangement at the end', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'a', seat_order: 1 },
      { player_id: 'b', seat_order: 0 },
      { player_id: 'c', seat_order: null },
      { player_id: 'd', seat_order: null },
    ])
    expect(names(sorted)).toEqual(['Boaz', 'Amit', 'Carmel', 'Dana'])
  })

  it('keeps late arrivals alphabetical among themselves', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'd', seat_order: 0 },
      { player_id: 'a', seat_order: null },
      { player_id: 'b', seat_order: null },
      { player_id: 'c', seat_order: null },
    ])
    expect(names(sorted)).toEqual(['Dana', 'Amit', 'Boaz', 'Carmel'])
  })

  it('treats seat 0 as arranged, not as missing', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'd', seat_order: 0 },
      { player_id: 'a', seat_order: null },
      { player_id: 'b', seat_order: null },
      { player_id: 'c', seat_order: null },
    ])
    expect(sorted[0].display_name).toBe('Dana')
  })

  it('tolerates a roster entry with no matching game_players row', () => {
    const sorted = sortBySeatOrder(alphabetical, [
      { player_id: 'a', seat_order: 0 },
    ])
    expect(names(sorted)).toEqual(['Amit', 'Boaz', 'Carmel', 'Dana'])
  })

  it('handles an empty roster', () => {
    expect(sortBySeatOrder([], [])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const input = [...alphabetical]
    sortBySeatOrder(input, [
      { player_id: 'a', seat_order: 3 },
      { player_id: 'd', seat_order: 0 },
    ])
    expect(names(input)).toEqual(['Amit', 'Boaz', 'Carmel', 'Dana'])
  })
})
