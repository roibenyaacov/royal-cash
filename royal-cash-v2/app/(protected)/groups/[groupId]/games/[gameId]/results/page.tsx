import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameResults, getGameSettlements } from '@/lib/db/results'
import ResultsClient from './results-client'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const { groupId, gameId } = await params
  const supabase = await createClient()

  const [game, allPlayers, results, settlements] = await Promise.all([
    getGame(supabase, gameId),
    getGroupPlayers(supabase, groupId),
    getGameResults(supabase, gameId),
    getGameSettlements(supabase, gameId),
  ])

  if (!game) notFound()

  return (
    <ResultsClient
      groupId={groupId}
      gameId={gameId}
      game={game}
      players={allPlayers}
      results={results}
      settlements={settlements}
    />
  )
}
