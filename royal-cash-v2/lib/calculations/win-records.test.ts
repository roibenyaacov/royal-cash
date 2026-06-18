import { describe, it, expect } from 'vitest'
import type { GameResult } from '@/lib/domain/types'

/** Mirrors win-record insert logic in applyGameStats (game_net only, no food). */
function collectGameNetWinsForRecords(
  results: Pick<GameResult, 'player_id' | 'game_net'>[],
): number[] {
  return results
    .filter((r) => r.game_net > 0)
    .map((r) => r.game_net)
}

describe('group win records (game_net)', () => {
  it('uses poker net only and ignores food-inflated final_balance', () => {
    const results = [
      { player_id: 'roi', game_net: 300 },
      { player_id: 'tamar', game_net: -100 },
    ]

    expect(collectGameNetWinsForRecords(results)).toEqual([300])
  })

  it('records every positive game_net in the game, not only record breakers', () => {
    const results = [
      { player_id: 'a', game_net: 400 },
      { player_id: 'b', game_net: 250 },
      { player_id: 'c', game_net: -50 },
    ]

    expect(collectGameNetWinsForRecords(results)).toEqual([400, 250])
  })
})
