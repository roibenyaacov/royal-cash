'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { InviteLink } from '@/components/ui/invite-link'
import { WinPodium } from '@/components/groups/win-podium'
import { PlayerSheet } from '@/components/groups/player-sheet'
import { createClient } from '@/lib/supabase/client'
import { getGroup } from '@/lib/db/groups'
import { getGroupPlayers } from '@/lib/db/players'
import { createPlayerAction } from '@/app/actions/players'
import { generateGroupInviteLink } from '@/app/actions/invites'
import { getGroupGames } from '@/lib/db/games'
import { getPlayerGroupStats, getGroupAllTimeGameWins } from '@/lib/db/stats'
import type {
  Player,
  Game,
  Group,
  PlayerGroupStats,
  GroupWinRecord,
  Currency,
} from '@/lib/domain/types'

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [group, setGroup] = useState<Group | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerGroupStats[]>([])
  const [winRecords, setWinRecords] = useState<GroupWinRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Add player sheet
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)

  // Player detail sheet
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Group invite
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  useEffect(() => {
    params.then((p) => setGroupId(p.groupId))
  }, [params])

  const fetchData = useCallback(async () => {
    if (!groupId) return
    const supabase = createClient()
    try {
      const [groupData, playersData, gamesData, statsData, recordsData] =
        await Promise.all([
          getGroup(supabase, groupId),
          getGroupPlayers(supabase, groupId),
          getGroupGames(supabase, groupId),
          getPlayerGroupStats(supabase, groupId).catch(() => [] as PlayerGroupStats[]),
          getGroupAllTimeGameWins(supabase, groupId).catch(() => [] as GroupWinRecord[]),
        ])
      setGroup(groupData)
      setPlayers(playersData)
      setGames(gamesData)
      setPlayerStats(statsData)
      setWinRecords(recordsData)
    } catch (err) {
      console.error('Failed to fetch group data:', err)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statsByPlayer = useMemo(
    () => new Map(playerStats.map((s) => [s.player_id, s])),
    [playerStats],
  )

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const defaultCurrency = (games[0]?.currency ?? 'ILS') as Currency
  const symbol = t.currency[defaultCurrency]

  const handleAddPlayer = async () => {
    if (!playerName.trim() || saving || !groupId) return
    setSaving(true)
    try {
      const player = await createPlayerAction(groupId, playerName.trim())
      setPlayers((prev) => [...prev, player])
      setPlayerName('')
      setShowAddPlayer(false)
    } catch (err) {
      console.error('Failed to add player:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true)
    try {
      const { token } = await generateGroupInviteLink(groupId, { role: 'member' })
      setInviteUrl(`${window.location.origin}/invite/group/${token}`)
    } catch (err) {
      console.error('Failed to generate invite:', err)
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleNewGame = () => {
    router.push(`/groups/${groupId}/games/new`)
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t.groups.myGroups} showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  const activeGames = games.filter((g) => g.status === 'active')
  const historyGames = games.filter((g) => g.status === 'closed' && g.finalized_at)

  return (
    <>
      <PageHeader title={group?.name ?? t.groups.myGroups} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-6">
        {/* Players section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text-primary">
              {t.players.players} ({players.length})
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setShowInvite(true); if (!inviteUrl) handleGenerateInvite() }}
              >
                הזמן 🔗
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowAddPlayer(true)}>
                {t.players.addPlayer}
              </Button>
            </div>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map((p) => {
                const stats = statsByPlayer.get(p.id)
                const isLinked = !!p.linked_user_id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayer(p)}
                    className="w-full text-right"
                  >
                    <Card className="active:bg-surface-elevated transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-text-primary truncate">
                            {p.display_name}
                          </span>
                          {isLinked && (
                            <span className="shrink-0 text-[10px] text-positive bg-positive/10 px-1.5 py-0.5 rounded-full">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {stats && stats.games_played > 0 && (
                            <div className="text-xs text-left" dir="ltr">
                              <span
                                className={stats.total_balance >= 0 ? 'text-positive' : 'text-negative'}
                              >
                                {symbol}{Math.abs(stats.total_balance)}
                              </span>
                              <span className="text-text-muted">
                                {' '}· {stats.games_played}
                              </span>
                            </div>
                          )}
                          <span className="text-text-muted text-base">›</span>
                        </div>
                      </div>
                    </Card>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Active games */}
        {activeGames.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.game.activeGames}
            </h2>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => (
                <a key={g.id} href={`/groups/${groupId}/games/${g.id}`}>
                  <GameListCard game={g} />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* New game button */}
        {players.length >= 2 && (
          <Button fullWidth size="lg" onClick={handleNewGame}>
            {t.game.newGame}
          </Button>
        )}

        {/* Win podium */}
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.groups.podiumTitle}
          </h2>
          <WinPodium
            records={winRecords}
            playerNames={playerNames}
            currency={defaultCurrency}
          />
        </section>

        {/* Game history */}
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.game.gameHistory}
          </h2>
          {historyGames.length === 0 ? (
            <EmptyState message={t.game.noPreviousGames} />
          ) : (
            <div className="flex flex-col gap-2">
              {historyGames.map((g) => (
                <a key={g.id} href={`/groups/${groupId}/games/${g.id}/results`}>
                  <GameListCard game={g} />
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add player sheet */}
      <BottomSheet
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        title={t.players.addPlayer}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t.players.playerName}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            autoFocus
          />
          <Button
            fullWidth
            onClick={handleAddPlayer}
            disabled={!playerName.trim() || saving}
          >
            {saving ? t.common.loading : t.players.addPlayer}
          </Button>
        </div>
      </BottomSheet>

      {/* Group invite sheet */}
      <BottomSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title={t.invites.inviteToGroup}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">{t.invites.inviteToGroupDesc}</p>
          {generatingInvite ? (
            <div className="flex justify-center py-4"><Loading /></div>
          ) : inviteUrl ? (
            <InviteLink
              url={inviteUrl}
              title={t.invites.inviteToGroup}
              message={`הצטרף לחבורה ${group?.name ?? ''} ב-Royal Cash:`}
            />
          ) : (
            <Button fullWidth onClick={handleGenerateInvite}>
              {t.invites.generateGroupLink}
            </Button>
          )}
        </div>
      </BottomSheet>

      {/* Player detail sheet */}
      <PlayerSheet
        player={selectedPlayer}
        stats={selectedPlayer ? statsByPlayer.get(selectedPlayer.id) : undefined}
        currency={defaultCurrency}
        groupId={groupId}
        onClose={() => setSelectedPlayer(null)}
      />
    </>
  )
}

function GameListCard({ game }: { game: Game }) {
  return (
    <Card className="active:bg-surface-elevated transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{game.name}</h3>
          <p className="text-sm text-text-muted">{game.date}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            game.status === 'active'
              ? 'bg-positive/10 text-positive'
              : 'bg-border text-text-muted'
          }`}
        >
          {game.status === 'active' ? 'פעיל' : 'סגור'}
        </span>
      </div>
    </Card>
  )
}
