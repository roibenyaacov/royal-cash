import type { SupabaseClient } from '@supabase/supabase-js'
import type { Player } from '@/lib/domain/types'

export async function getGroupPlayers(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('display_name')

  if (error) throw error
  return data ?? []
}

export type PlayerGameHistoryEntry = {
  game_id: string
  game_name: string
  game_date: string
  final_balance: number
  total_buy_in: number
  cash_out: number
  finalized_at: string
}

export async function getPlayerGameHistory(
  supabase: SupabaseClient,
  playerId: string,
  groupId: string,
): Promise<PlayerGameHistoryEntry[]> {
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, name, date, finalized_at')
    .eq('group_id', groupId)
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })

  if (gamesError) throw gamesError
  if (!games?.length) return []

  const gameIds = games.map((g) => g.id)
  const gameById = new Map(games.map((g) => [g.id, g]))

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('game_id, final_balance, total_buy_in, cash_out')
    .eq('player_id', playerId)
    .in('game_id', gameIds)

  if (resultsError) throw resultsError

  return (results ?? []).map((r) => {
    const game = gameById.get(r.game_id)!
    return {
      game_id: r.game_id,
      game_name: game.name,
      game_date: game.date,
      final_balance: r.final_balance,
      total_buy_in: r.total_buy_in,
      cash_out: r.cash_out,
      finalized_at: game.finalized_at,
    }
  })
}

export async function createPlayer(
  supabase: SupabaseClient,
  groupId: string,
  displayName: string,
  phone?: string,
): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      group_id: groupId,
      display_name: displayName,
      phone: phone ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
