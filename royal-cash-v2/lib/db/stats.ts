import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Game,
  GameResult,
  GroupWinRecord,
  PlayerGroupStats,
} from '@/lib/domain/types'

export async function getPlayerGroupStats(
  supabase: SupabaseClient,
  groupId: string,
): Promise<PlayerGroupStats[]> {
  const { data, error } = await supabase
    .from('player_group_stats')
    .select('*')
    .eq('group_id', groupId)

  if (error) throw error
  return data ?? []
}

export async function getGroupAllTimeGameWins(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupWinRecord[]> {
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, name, date, finalized_at')
    .eq('group_id', groupId)
    .not('finalized_at', 'is', null)

  if (gamesError) throw gamesError
  if (!games?.length) return []

  const gameIds = games.map((g) => g.id)
  const gameById = new Map(games.map((g) => [g.id, g]))

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('id, player_id, game_id, game_net, created_at')
    .in('game_id', gameIds)
    .gt('game_net', 0)
    .order('game_net', { ascending: false })

  if (resultsError) throw resultsError

  return (results ?? []).map((r) => {
    const game = gameById.get(r.game_id)
    return {
      id: r.id,
      group_id: groupId,
      player_id: r.player_id,
      game_id: r.game_id,
      amount: r.game_net,
      achieved_at: game?.finalized_at ?? r.created_at,
      game: game ? { name: game.name, date: game.date } : undefined,
    }
  })
}

/** Top poker wins (game_net, before food) from all finalized games. */
export async function getGroupWinRecords(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupWinRecord[]> {
  return getGroupAllTimeGameWins(supabase, groupId)
}

export async function applyGameStats(
  supabase: SupabaseClient,
  groupId: string,
  gameId: string,
  results: GameResult[],
): Promise<void> {
  if (results.length === 0) return

  const playerIds = results.map((r) => r.player_id)

  // Batch fetch existing stats for all players in this game in one round-trip.
  const { data: existingRows, error: selectError } = await supabase
    .from('player_group_stats')
    .select('*')
    .eq('group_id', groupId)
    .in('player_id', playerIds)

  if (selectError) throw selectError

  const existingByPlayer = new Map(
    (existingRows ?? []).map((row) => [row.player_id as string, row]),
  )

  const nowIso = new Date().toISOString()
  const upsertPayload = results.map((result) => {
    const existing = existingByPlayer.get(result.player_id)
    return {
      player_id: result.player_id,
      group_id: groupId,
      games_played: (existing?.games_played ?? 0) + 1,
      total_balance: (existing?.total_balance ?? 0) + result.final_balance,
      biggest_win: Math.max(
        existing?.biggest_win ?? 0,
        result.final_balance > 0 ? result.final_balance : 0,
      ),
      biggest_loss: Math.min(
        existing?.biggest_loss ?? 0,
        result.final_balance < 0 ? result.final_balance : 0,
      ),
      updated_at: nowIso,
    }
  })

  // Single batched upsert instead of N round-trips.
  const { error: upsertError } = await supabase
    .from('player_group_stats')
    .upsert(upsertPayload, { onConflict: 'player_id,group_id' })

  if (upsertError) throw upsertError

  const winners = results.filter((r) => r.game_net > 0)
  if (winners.length === 0) return

  const { data: existingRecords, error: existingError } = await supabase
    .from('group_win_records')
    .select('player_id')
    .eq('game_id', gameId)

  if (existingError) throw existingError

  const existingPlayers = new Set(
    (existingRecords ?? []).map((row) => row.player_id as string),
  )

  const toInsert = winners
    .filter((winner) => !existingPlayers.has(winner.player_id))
    .map((winner) => ({
      group_id: groupId,
      player_id: winner.player_id,
      game_id: gameId,
      amount: winner.game_net,
    }))

  if (toInsert.length === 0) return

  const { error: insertError } = await supabase
    .from('group_win_records')
    .insert(toInsert)

  if (insertError) throw insertError
}

export async function getPlayerWinCounts(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Map<string, number>> {
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id')
    .eq('group_id', groupId)
    .not('finalized_at', 'is', null)

  if (gamesError) throw gamesError
  if (!games || games.length === 0) return new Map()

  const gameIds = games.map((g) => g.id)
  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('player_id, final_balance')
    .in('game_id', gameIds)
    .gt('final_balance', 0)

  if (resultsError) throw resultsError

  const wins = new Map<string, number>()
  for (const row of results ?? []) {
    wins.set(row.player_id, (wins.get(row.player_id) ?? 0) + 1)
  }
  return wins
}

export async function getRecentFinalizedGames(
  supabase: SupabaseClient,
  groupId: string,
  limit = 10,
): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('group_id', groupId)
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export type GameHistoryEntry = {
  game_id: string
  game_name: string
  finalized_at: string
  player_id: string
  final_balance: number
}

export async function getGroupGameHistory(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GameHistoryEntry[]> {
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, name, finalized_at')
    .eq('group_id', groupId)
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: true })

  if (gamesError) throw gamesError
  if (!games?.length) return []

  const gameIds = games.map((g) => g.id)
  const gameById = new Map(games.map((g) => [g.id, g]))

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('game_id, player_id, final_balance')
    .in('game_id', gameIds)

  if (resultsError) throw resultsError

  return (results ?? []).map((r) => {
    const game = gameById.get(r.game_id)!
    return {
      game_id: r.game_id,
      game_name: game.name,
      finalized_at: game.finalized_at,
      player_id: r.player_id,
      final_balance: r.final_balance,
    }
  })
}
