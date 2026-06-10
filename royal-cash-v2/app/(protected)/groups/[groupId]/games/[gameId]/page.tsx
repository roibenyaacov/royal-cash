import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGameRosterPlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
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

  const [game, gamePlayers, allGroupPlayers, buyIns, { expenses, participants }, events] =
    await Promise.all([
      getGame(supabase, gameId),
      getGameRosterPlayers(supabase, gameId),
      getGroupPlayers(supabase, groupId),
      getGameBuyIns(supabase, gameId),
      getGameExpensesWithParticipants(supabase, gameId),
      getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
    ])

  if (!game) notFound()

  return (
    <ActiveGameClient
      groupId={groupId}
      gameId={gameId}
      initialGame={game}
      initialPlayers={gamePlayers}
      initialAllGroupPlayers={allGroupPlayers}
      initialBuyIns={buyIns}
      initialExpenses={expenses}
      initialExpenseParticipants={participants}
      initialEvents={events}
    />
  )
}
