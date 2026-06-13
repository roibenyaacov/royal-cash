import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  return {
    userId: user.id,
    game,
    db: createAdminClient(),
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
