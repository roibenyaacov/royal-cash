import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGameRosterPlayers, getGamePlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameCashOuts } from '@/lib/db/cashouts'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import { getGameEvents } from '@/lib/db/game-events'
import ActiveGameClient from './active-game-client'
import type { GameEvent } from '@/lib/domain/types'

export default async function ActiveGamePage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const { groupId, gameId } = await params
  const supabase = await createClient()

  const [
    { data: { user } },
    game,
    gamePlayers,
    gameRoster,
    allGroupPlayers,
    buyIns,
    cashOuts,
    { expenses, participants },
    events,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getGame(supabase, gameId),
    getGamePlayers(supabase, gameId),
    getGameRosterPlayers(supabase, gameId),
    getGroupPlayers(supabase, groupId),
    getGameBuyIns(supabase, gameId),
    getGameCashOuts(supabase, gameId),
    getGameExpensesWithParticipants(supabase, gameId),
    getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
  ])

  if (!game) notFound()

  if (game.status !== 'active') {
    redirect(`/groups/${groupId}/games/${gameId}/results`)
  }

  const managerPlayerIds = gamePlayers
    .filter((gp) => gp.is_manager)
    .map((gp) => gp.player_id)

  // The player in this group linked to the current user — used to decide
  // whether they're one of the money managers.
  let currentUserPlayerId: string | null = null
  if (user) {
    const { data: myPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('group_id', game.group_id)
      .eq('linked_user_id', user.id)
      .maybeSingle()
    currentUserPlayerId = myPlayer?.id ?? null
  }

  return (
    <ActiveGameClient
      groupId={groupId}
      gameId={gameId}
      initialGame={game}
      initialPlayers={gameRoster}
      initialAllGroupPlayers={allGroupPlayers}
      initialBuyIns={buyIns}
      initialCashOuts={cashOuts}
      initialExpenses={expenses}
      initialExpenseParticipants={participants}
      initialEvents={events}
      initialManagerPlayerIds={managerPlayerIds}
      currentUserId={user?.id ?? null}
      currentUserPlayerId={currentUserPlayerId}
    />
  )
}
