import type { SupabaseClient } from '@supabase/supabase-js'
import type { Game, GamePlayer } from '@/lib/domain/types'

export async function getGroupGames(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (error) return null
  return data
}

export async function createGame(
  supabase: SupabaseClient,
  game: Omit<Game, 'id' | 'created_at' | 'closed_at' | 'finalized_at'>,
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function closeGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', gameId)

  if (error) throw error
}

export async function finalizeGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('games')
    .update({ finalized_at: new Date().toISOString() })
    .eq('id', gameId)
    .is('finalized_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return !!data
}

export async function getGamePlayers(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)

  if (error) throw error
  return data ?? []
}

export async function addGamePlayer(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .insert({ game_id: gameId, player_id: playerId })

  if (error) throw error
}
