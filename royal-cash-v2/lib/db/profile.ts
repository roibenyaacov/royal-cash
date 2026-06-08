import type { SupabaseClient } from '@supabase/supabase-js'
import { calcWinRatePercent } from '@/lib/calculations/stats'
import type { User } from '@/lib/domain/types'

export type LinkedPlayerIdentity = {
  displayName: string
  groupName: string
}

export type PersonalStats = {
  profile: Pick<User, 'full_name' | 'email' | 'avatar_url' | 'phone'>
  gamesPlayed: number
  totalBalance: number
  biggestWin: number
  biggestLoss: number
  winCount: number
  winRatePercent: number
  hasLinkedPlayers: boolean
  linkedIdentities: LinkedPlayerIdentity[]
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateProfilePhone(
  supabase: SupabaseClient,
  userId: string,
  phone: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', userId)

  if (error) throw error
}

export async function getPersonalStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalStats> {
  const profile = await getProfile(supabase, userId)

  const empty: PersonalStats = {
    profile: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
      avatar_url: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
    },
    gamesPlayed: 0,
    totalBalance: 0,
    biggestWin: 0,
    biggestLoss: 0,
    winCount: 0,
    winRatePercent: 0,
    hasLinkedPlayers: false,
    linkedIdentities: [],
  }

  if (!profile) return empty

  const { data: linkedPlayers, error: playersError } = await supabase
    .from('players')
    .select('id, display_name, groups(name)')
    .eq('linked_user_id', userId)

  if (playersError) throw playersError
  if (!linkedPlayers?.length) return empty

  const linkedIdentities: LinkedPlayerIdentity[] = linkedPlayers.map((row) => {
    const group = row.groups as { name: string } | { name: string }[] | null
    const groupName = Array.isArray(group) ? group[0]?.name : group?.name
    return {
      displayName: row.display_name,
      groupName: groupName ?? '',
    }
  })

  const playerIds = linkedPlayers.map((p) => p.id)

  const { data: statsRows, error: statsError } = await supabase
    .from('player_group_stats')
    .select('games_played, total_balance')
    .in('player_id', playerIds)

  if (statsError) throw statsError

  let gamesPlayed = 0
  let totalBalance = 0
  for (const row of statsRows ?? []) {
    gamesPlayed += row.games_played
    totalBalance += row.total_balance
  }

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('game_id, game_net, final_balance')
    .in('player_id', playerIds)

  if (resultsError) throw resultsError
  if (!results?.length) {
    return { ...empty, hasLinkedPlayers: true, gamesPlayed, totalBalance, linkedIdentities }
  }

  const gameIds = [...new Set(results.map((r) => r.game_id))]
  const { data: finalizedGames, error: gamesError } = await supabase
    .from('games')
    .select('id')
    .in('id', gameIds)
    .not('finalized_at', 'is', null)

  if (gamesError) throw gamesError

  const finalizedIds = new Set(finalizedGames?.map((g) => g.id) ?? [])
  const finalizedResults = results.filter((r) => finalizedIds.has(r.game_id))

  let biggestWin = 0
  let biggestLoss = 0
  let winCount = 0

  for (const row of finalizedResults) {
    if (row.game_net > biggestWin) biggestWin = row.game_net
    if (row.game_net < biggestLoss) biggestLoss = row.game_net
    if (row.final_balance > 0) winCount += 1
  }

  return {
    profile: {
      full_name: profile.full_name ?? '',
      email: profile.email ?? '',
      avatar_url: profile.avatar_url,
      phone: profile.phone,
    },
    gamesPlayed,
    totalBalance,
    biggestWin,
    biggestLoss,
    winCount,
    winRatePercent: calcWinRatePercent(winCount, gamesPlayed),
    hasLinkedPlayers: true,
    linkedIdentities,
  }
}
