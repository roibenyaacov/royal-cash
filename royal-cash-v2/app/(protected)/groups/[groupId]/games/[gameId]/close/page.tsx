import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame, getGameRosterPlayers } from '@/lib/db/games'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameCashOuts } from '@/lib/db/cashouts'
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

  const [game, rosterPlayers, buyIns, cashOuts, { expenses, participants }] =
    await Promise.all([
      getGame(supabase, gameId),
      getGameRosterPlayers(supabase, gameId),
      getGameBuyIns(supabase, gameId),
      getGameCashOuts(supabase, gameId),
      getGameExpensesWithParticipants(supabase, gameId),
    ])

  if (!game) notFound()

  // A closed (or archived) game can't be closed again. If the user navigated
  // here via browser Back or a stale link, send them straight to the
  // results screen instead of letting them fill out a doomed form.
  if (game.status !== 'active') {
    redirect(`/groups/${groupId}/games/${gameId}/results`)
  }

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
      cashOuts={cashOuts}
      expenses={expenses}
      expenseParticipants={participants}
    />
  )
}
