import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getGame as dbGetGame } from '@/lib/db/games'
import type { Game } from '@/lib/domain/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type ActiveGameMutationContext = {
  userId: string
  game: Game
  db: SupabaseClient
}

export async function assertGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) throw new Error('Not a group member')
}

export async function assertGroupOwner(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .maybeSingle()

  if (!group || group.owner_id !== userId) {
    throw new Error('Not authorized')
  }
}

export async function authorizeActiveGameMutation(
  gameId: string,
): Promise<ActiveGameMutationContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const game = await dbGetGame(supabase, gameId)
  if (!game) throw new Error('Game not found')
  if (game.status !== 'active') throw new Error('Game is not active')

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', game.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Not a group member')

  // Return the authenticated user's Supabase client so every mutation is
  // still gated by RLS (migration 017 grants insert/update/delete on
  // active-game tables to every group member). This preserves defense in
  // depth: a bug in this Node-side membership check cannot escalate beyond
  // what the user's auth.uid() is allowed to do in Postgres.
  return {
    userId: user.id,
    game,
    db: supabase,
  }
}

export async function assertPlayerInActiveGame(
  db: SupabaseClient,
  gameId: string,
  playerId: string,
): Promise<void> {
  const { data, error } = await db
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Player not in game')
}
