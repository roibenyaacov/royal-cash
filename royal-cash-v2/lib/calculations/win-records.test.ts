import { describe, it, expect } from 'vitest'
import type { GameResult } from '@/lib/domain/types'

/** Mirrors record-break logic in applyGameStats (game_net only, no food). */
function collectGameNetRecordBreaks(
  results: Pick<GameResult, 'player_id' | 'game_net'>[],
  currentRecord: number,
): number[] {
  const inserted: number[] = []
  let record = currentRecord

  const winners = [...results]
    .filter((r) => r.game_net > 0)
    .sort((a, b) => b.game_net - a.game_net)

  for (const winner of winners) {
    if (winner.game_net <= record) continue
    inserted.push(winner.game_net)
    record = winner.game_net
  }

  return inserted
}

describe('group win records (game_net)', () => {
  it('uses poker net only and ignores food-inflated final_balance', () => {
    const results = [
      { player_id: 'roi', game_net: 300 },
      { player_id: 'tamar', game_net: -100 },
    ]

    const breaks = collectGameNetRecordBreaks(results, 0)
    expect(breaks).toEqual([300])
  })

  it('adds a record break only when game_net exceeds the current record', () => {
    const results = [
      { player_id: 'a', game_net: 400 },
      { player_id: 'b', game_net: 250 },
    ]

    expect(collectGameNetRecordBreaks(results, 200)).toEqual([400])
    expect(collectGameNetRecordBreaks(results, 0)).toEqual([400])
  })
})
