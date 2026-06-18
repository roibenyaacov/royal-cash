import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGameRosterPlayers } from '@/lib/db/games'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { calcPlayerBuyIns } from '@/lib/calculations/buy-ins'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import CloseGameClient from './close-game-client'

export default async function CloseGamePage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const { groupId, gameId } = await params
  const supabase = await createClient()

  const [game, rosterPlayers, buyIns, { expenses, participants }] =
    await Promise.all([
      getGame(supabase, gameId),
      getGameRosterPlayers(supabase, gameId),
      getGameBuyIns(supabase, gameId),
      getGameExpensesWithParticipants(supabase, gameId),
    ])

  if (!game) notFound()

  const gamePlayers = rosterPlayers.filter(
    (p) => calcPlayerBuyIns(buyIns, p.id) > 0,
  )

  return (
    <CloseGameClient
      groupId={groupId}
      gameId={gameId}
      game={game}
      players={gamePlayers}
      buyIns={buyIns}
      expenses={expenses}
      expenseParticipants={participants}
    />
  )
}
