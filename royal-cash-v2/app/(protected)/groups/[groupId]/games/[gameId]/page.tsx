import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGamePlayers } from '@/lib/db/games'
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

  const [game, gamePlayersData, allGroupPlayers, buyIns, { expenses, participants }, events] =
    await Promise.all([
      getGame(supabase, gameId),
      getGamePlayers(supabase, gameId),
      getGroupPlayers(supabase, groupId),
      getGameBuyIns(supabase, gameId),
      getGameExpensesWithParticipants(supabase, gameId),
      getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
    ])

  if (!game) notFound()

  const gamePlayerIds = new Set(gamePlayersData.map((gp) => gp.player_id))
  const gamePlayers = allGroupPlayers.filter((p) => gamePlayerIds.has(p.id))

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
