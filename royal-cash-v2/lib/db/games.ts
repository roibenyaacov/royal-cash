import type { SupabaseClient } from '@supabase/supabase-js'
import type { Game, GamePlayer, Player } from '@/lib/domain/types'

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

// Active games across every group the current user belongs to (RLS scopes the
// result to their memberships). Powers the app-wide "return to table" shortcut.
export async function getMyActiveGames(
  supabase: SupabaseClient,
): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'active')
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

export async function deleteGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', gameId)

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
  isManager = false,
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .insert({ game_id: gameId, player_id: playerId, is_manager: isManager })

  if (error) throw error
}

// Set exactly which players are responsible for the money. An empty list means
// "everyone" (no one is singled out, so the app lets all members manage).
export async function setGameManagers(
  supabase: SupabaseClient,
  gameId: string,
  managerPlayerIds: string[],
): Promise<void> {
  const { error: resetError } = await supabase
    .from('game_players')
    .update({ is_manager: false })
    .eq('game_id', gameId)

  if (resetError) throw resetError

  if (managerPlayerIds.length > 0) {
    const { error } = await supabase
      .from('game_players')
      .update({ is_manager: true })
      .eq('game_id', gameId)
      .in('player_id', managerPlayerIds)

    if (error) throw error
  }
}

export async function removeGamePlayer(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)

  if (error) throw error
}

export async function getGameRosterPlayers(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Player[]> {
  const gamePlayers = await getGamePlayers(supabase, gameId)
  if (!gamePlayers.length) return []

  const playerIds = gamePlayers.map((gp) => gp.player_id)
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('id', playerIds)
    .order('display_name')

  if (error) throw error
  return data ?? []
}
