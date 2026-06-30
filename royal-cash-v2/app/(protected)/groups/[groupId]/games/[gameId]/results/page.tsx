import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGame } from '@/lib/db/games'
import { getPlayersByIds } from '@/lib/db/players'
import { getGameResults, getGameSettlements } from '@/lib/db/results'
import ResultsClient from './results-client'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const { groupId, gameId } = await params
  const supabase = await createClient()

  const [game, results, settlements] = await Promise.all([
    getGame(supabase, gameId),
    getGameResults(supabase, gameId),
    getGameSettlements(supabase, gameId),
  ])

  if (!game) notFound()

  // Resolve names for every player referenced here — including one-night
  // temporary players (is_active = false), which getGroupPlayers would drop,
  // leaving raw UUIDs in the results/settlements list.
  const referencedIds = Array.from(
    new Set([
      ...results.map((r) => r.player_id),
      ...settlements.flatMap((s) => [s.from_player_id, s.to_player_id]),
    ]),
  )
  const allPlayers = await getPlayersByIds(supabase, referencedIds)

  // Only send back to the close form when the game is still open *and* has
  // no saved results. After a successful close, RSC cache can briefly still
  // report status=active even though results were written — in that case we
  // must render the results screen, not bounce the user back to the table.
  if (game.status === 'active' && results.length === 0) {
    redirect(`/groups/${groupId}/games/${gameId}/close`)
  }

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
