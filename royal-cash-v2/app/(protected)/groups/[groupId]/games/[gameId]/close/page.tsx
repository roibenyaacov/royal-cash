import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGamePlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import CloseGameClient from './close-game-client'

export default async function CloseGamePage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const { groupId, gameId } = await params
  const supabase = await createClient()

  const [game, gamePlayersData, allGroupPlayers, buyIns, { expenses, participants }] =
    await Promise.all([
      getGame(supabase, gameId),
      getGamePlayers(supabase, gameId),
      getGroupPlayers(supabase, groupId),
      getGameBuyIns(supabase, gameId),
      getGameExpensesWithParticipants(supabase, gameId),
    ])

  if (!game) notFound()

  const gamePlayerIds = new Set(gamePlayersData.map((gp) => gp.player_id))
  const gamePlayers = allGroupPlayers.filter((p) => gamePlayerIds.has(p.id))

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
