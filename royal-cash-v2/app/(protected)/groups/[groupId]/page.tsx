import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroup } from '@/lib/db/groups'
import { getGroupPlayers, getPlayersByIds } from '@/lib/db/players'
import { getGroupGames } from '@/lib/db/games'
import { getPlayerGroupStats, getGroupWinRecords } from '@/lib/db/stats'
import GroupDetailClient from './group-detail-client'
import type { Player, PlayerGroupStats, GroupWinRecord } from '@/lib/domain/types'

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()

  const [group, players, games, stats, winRecords, { data: { user } }] = await Promise.all([
    getGroup(supabase, groupId),
    getGroupPlayers(supabase, groupId),
    getGroupGames(supabase, groupId),
    getPlayerGroupStats(supabase, groupId).catch(() => [] as PlayerGroupStats[]),
    getGroupWinRecords(supabase, groupId).catch(() => [] as GroupWinRecord[]),
    supabase.auth.getUser(),
  ])

  if (!group) notFound()

  // A record can belong to a one-night temporary player (is_active = false),
  // which getGroupPlayers drops — resolve those names separately so the podium
  // shows a name instead of falling back to a raw player id.
  const rosterIds = new Set(players.map((p) => p.id))
  const missingNameIds = Array.from(
    new Set(
      winRecords.map((r) => r.player_id).filter((id) => !rosterIds.has(id)),
    ),
  )
  const winRecordPlayers = await getPlayersByIds(supabase, missingNameIds).catch(
    () => [] as Player[],
  )

  return (
    <GroupDetailClient
      groupId={groupId}
      group={group}
      initialPlayers={players}
      initialGames={games}
      playerStats={stats}
      winRecords={winRecords}
      winRecordPlayers={winRecordPlayers}
      currentUserId={user?.id ?? null}
    />
  )
}
