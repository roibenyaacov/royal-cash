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

export async function getGroupWinRecords(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupWinRecord[]> {
  const { data, error } = await supabase
    .from('group_win_records')
    .select('*, games(name, date)')
    .eq('group_id', groupId)
    .order('amount', { ascending: false })
    .order('achieved_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const { games, ...record } = row as GroupWinRecord & {
      games: GroupWinRecord['game'] | null
    }
    return { ...record, game: games ?? undefined }
  })
}

export async function getGroupRecordAmount(
  supabase: SupabaseClient,
  groupId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('group_win_records')
    .select('amount')
    .eq('group_id', groupId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.amount ?? 0
}

export async function applyGameStats(
  supabase: SupabaseClient,
  groupId: string,
  gameId: string,
  results: GameResult[],
): Promise<void> {
  for (const result of results) {
    const { data: existing, error: selectError } = await supabase
      .from('player_group_stats')
      .select('*')
      .eq('player_id', result.player_id)
      .eq('group_id', groupId)
      .maybeSingle()

    if (selectError) throw selectError

    const gamesPlayed = (existing?.games_played ?? 0) + 1
    const totalBalance = (existing?.total_balance ?? 0) + result.final_balance
    const biggestWin = Math.max(
      existing?.biggest_win ?? 0,
      result.final_balance > 0 ? result.final_balance : 0,
    )
    const biggestLoss = Math.min(
      existing?.biggest_loss ?? 0,
      result.final_balance < 0 ? result.final_balance : 0,
    )

    const { error: upsertError } = await supabase
      .from('player_group_stats')
      .upsert(
        {
          player_id: result.player_id,
          group_id: groupId,
          games_played: gamesPlayed,
          total_balance: totalBalance,
          biggest_win: biggestWin,
          biggest_loss: biggestLoss,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,group_id' },
      )

    if (upsertError) throw upsertError
  }

  let currentRecord = await getGroupRecordAmount(supabase, groupId)

  const winners = [...results]
    .filter((r) => r.game_net > 0)
    .sort((a, b) => b.game_net - a.game_net)

  for (const winner of winners) {
    if (winner.game_net <= currentRecord) continue

    const { error: insertError } = await supabase
      .from('group_win_records')
      .insert({
        group_id: groupId,
        player_id: winner.player_id,
        game_id: gameId,
        amount: winner.game_net,
      })

    if (insertError) throw insertError
    currentRecord = winner.game_net
  }
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
