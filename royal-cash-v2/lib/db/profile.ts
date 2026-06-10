import type { SupabaseClient } from '@supabase/supabase-js'
import { calcWinRatePercent } from '@/lib/calculations/stats'
import type { User } from '@/lib/domain/types'

export type LinkedPlayerIdentity = {
  displayName: string
  groupName: string
}

export type PersonalGameHistoryEntry = {
  gameId: string
  gameName: string
  groupId: string
  groupName: string
  tableDisplayName: string
  finalBalance: number
  gameDate: string
  finalizedAt: string
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
  gameHistory: PersonalGameHistoryEntry[]
}

const PROFILE_BASE_COLUMNS =
  'id, email, full_name, avatar_url, created_at, updated_at' as const

function isMissingPhoneColumn(message: string): boolean {
  return message.includes('profiles.phone') || message.includes("'phone'")
}

async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<(User & { phone?: string | null }) | null> {
  const withPhone = await supabase
    .from('profiles')
    .select(`${PROFILE_BASE_COLUMNS}, phone`)
    .eq('id', userId)
    .maybeSingle()

  if (!withPhone.error) return withPhone.data

  if (!isMissingPhoneColumn(withPhone.error.message)) {
    throw new Error(withPhone.error.message)
  }

  const base = await supabase
    .from('profiles')
    .select(PROFILE_BASE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (base.error) throw new Error(base.error.message)
  if (!base.data) return null
  return { ...base.data, phone: null }
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<User | null> {
  return fetchProfileRow(supabase, userId)
}

export async function updateProfilePhone(
  supabase: SupabaseClient,
  userId: string,
  phone: string | null,
): Promise<void> {
  await upsertProfileFields(supabase, userId, { phone })
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: { full_name?: string | null; phone?: string | null },
): Promise<void> {
  await upsertProfileFields(supabase, userId, fields)
}

export async function upsertProfileFields(
  supabase: SupabaseClient,
  userId: string,
  fields: { full_name?: string | null; phone?: string | null },
  authUser?: {
    email?: string | null
    user_metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'upsert_my_profile',
    {
      p_full_name: fields.full_name ?? null,
      p_phone: fields.phone !== undefined ? fields.phone : null,
    },
  )

  if (!rpcError) {
    if (rpcData?.error === 'not_authenticated') {
      throw new Error('Not authenticated')
    }
    if (rpcData?.success) return
  }

  const rpcMissing =
    rpcError?.message?.includes('upsert_my_profile') ||
    rpcError?.code === 'PGRST202'

  if (!rpcMissing && rpcError) {
    throw new Error(rpcError.message)
  }

  const existing = await fetchProfileRow(supabase, userId)

  const fullName =
    fields.full_name !== undefined
      ? fields.full_name
      : (existing?.full_name ??
        (authUser?.user_metadata?.full_name as string | undefined) ??
        null)

  const phone =
    fields.phone !== undefined ? fields.phone : (existing?.phone ?? null)

  const payload: Record<string, unknown> = {
    id: userId,
    email: existing?.email ?? authUser?.email ?? null,
    full_name: fullName,
    avatar_url:
      existing?.avatar_url ??
      (authUser?.user_metadata?.avatar_url as string | undefined) ??
      null,
  }

  const withPhone = await supabase.from('profiles').upsert(
    { ...payload, phone },
    { onConflict: 'id' },
  )

  if (withPhone.error && isMissingPhoneColumn(withPhone.error.message)) {
    const withoutPhone = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
    if (withoutPhone.error) throw new Error(withoutPhone.error.message)
    if (fields.phone !== undefined && fields.phone) {
      throw new Error(
        'עמודת הטלפון חסרה בשרת. הרץ migration 006 או 015 ב-Supabase SQL Editor.',
      )
    }
    return
  }

  if (withPhone.error) throw new Error(withPhone.error.message)
}

type LinkedPlayerRow = {
  id: string
  display_name: string
  group_id: string
}

async function fetchGroupNames(
  supabase: SupabaseClient,
  groupIds: string[],
): Promise<Map<string, string>> {
  if (!groupIds.length) return new Map()

  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds)

  if (error) throw error
  return new Map((groups ?? []).map((g) => [g.id, g.name]))
}

async function fetchLinkedPlayers(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ players: LinkedPlayerRow[]; groupNameById: Map<string, string> }> {
  const { data: linkedPlayers, error: playersError } = await supabase
    .from('players')
    .select('id, display_name, group_id')
    .eq('linked_user_id', userId)

  if (playersError) throw playersError
  if (!linkedPlayers?.length) {
    return { players: [], groupNameById: new Map() }
  }

  const groupIds = [...new Set(linkedPlayers.map((p) => p.group_id))]
  const groupNameById = await fetchGroupNames(supabase, groupIds)

  return { players: linkedPlayers, groupNameById }
}

async function buildPersonalGameHistory(
  supabase: SupabaseClient,
  linkedPlayers: LinkedPlayerRow[],
  groupNameById: Map<string, string>,
): Promise<PersonalGameHistoryEntry[]> {
  if (!linkedPlayers.length) return []

  const playerById = new Map(
    linkedPlayers.map((p) => [
      p.id,
      {
        displayName: p.display_name,
        groupId: p.group_id,
        groupName: groupNameById.get(p.group_id) ?? '',
      },
    ]),
  )

  const playerIds = linkedPlayers.map((p) => p.id)

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('player_id, game_id, final_balance')
    .in('player_id', playerIds)

  if (resultsError) throw resultsError
  if (!results?.length) return []

  const gameIds = [...new Set(results.map((r) => r.game_id))]

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, name, date, group_id, finalized_at')
    .in('id', gameIds)
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })

  if (gamesError) throw gamesError
  if (!games?.length) return []

  const gameById = new Map(games.map((g) => [g.id, g]))

  const entries: PersonalGameHistoryEntry[] = []
  for (const row of results) {
    const game = gameById.get(row.game_id)
    if (!game?.finalized_at) continue

    const player = playerById.get(row.player_id)
    if (!player) continue

    entries.push({
      gameId: game.id,
      gameName: game.name,
      groupId: game.group_id,
      groupName: player.groupName,
      tableDisplayName: player.displayName,
      finalBalance: row.final_balance,
      gameDate: game.date,
      finalizedAt: game.finalized_at,
    })
  }

  entries.sort(
    (a, b) =>
      new Date(b.finalizedAt).getTime() - new Date(a.finalizedAt).getTime(),
  )

  return entries
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
    gameHistory: [],
  }

  if (!profile) return empty

  const { players: linkedPlayers, groupNameById } = await fetchLinkedPlayers(
    supabase,
    userId,
  )
  if (!linkedPlayers.length) return empty

  const linkedIdentities: LinkedPlayerIdentity[] = linkedPlayers.map((row) => ({
    displayName: row.display_name,
    groupName: groupNameById.get(row.group_id) ?? '',
  }))

  const playerIds = linkedPlayers.map((p) => p.id)

  const gameHistory = await buildPersonalGameHistory(
    supabase,
    linkedPlayers,
    groupNameById,
  ).catch(() => [] as PersonalGameHistoryEntry[])

  const { data: results, error: resultsError } = await supabase
    .from('game_results')
    .select('player_id, game_id, game_net, final_balance')
    .in('player_id', playerIds)

  if (resultsError) throw resultsError
  if (!results?.length) {
    return { ...empty, hasLinkedPlayers: true, linkedIdentities, gameHistory }
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

  const gamesByPlayer = new Map<string, Set<string>>()
  let totalBalance = 0
  let biggestWin = 0
  let biggestLoss = 0
  let winCount = 0

  for (const row of finalizedResults) {
    totalBalance += row.final_balance
    if (row.game_net > biggestWin) biggestWin = row.game_net
    if (row.game_net < biggestLoss) biggestLoss = row.game_net
    if (row.final_balance > 0) winCount += 1

    if (!gamesByPlayer.has(row.player_id)) {
      gamesByPlayer.set(row.player_id, new Set())
    }
    gamesByPlayer.get(row.player_id)!.add(row.game_id)
  }

  let gamesPlayed = 0
  for (const playerId of playerIds) {
    gamesPlayed += gamesByPlayer.get(playerId)?.size ?? 0
  }

  return {
    profile: {
      full_name: profile.full_name ?? '',
      email: profile.email ?? '',
      avatar_url: profile.avatar_url,
      phone: profile.phone ?? null,
    },
    gamesPlayed,
    totalBalance,
    biggestWin,
    biggestLoss,
    winCount,
    winRatePercent: calcWinRatePercent(winCount, gamesPlayed),
    hasLinkedPlayers: true,
    linkedIdentities,
    gameHistory,
  }
}
