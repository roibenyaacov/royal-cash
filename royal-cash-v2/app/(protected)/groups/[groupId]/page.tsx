import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroup } from '@/lib/db/groups'
import { getGroupPlayers } from '@/lib/db/players'
import { getGroupGames } from '@/lib/db/games'
import { getPlayerGroupStats, getGroupWinRecords } from '@/lib/db/stats'
import GroupDetailClient from './group-detail-client'
import type { PlayerGroupStats, GroupWinRecord } from '@/lib/domain/types'

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

  return (
    <GroupDetailClient
      groupId={groupId}
      group={group}
      initialPlayers={players}
      initialGames={games}
      playerStats={stats}
      winRecords={winRecords}
      currentUserId={user?.id ?? null}
    />
  )
}
