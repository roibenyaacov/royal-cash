'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { InviteLink } from '@/components/ui/invite-link'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { createClient } from '@/lib/supabase/client'
import { canViewPlayerPrivateData } from '@/lib/auth/player-privacy'
import { getGroupPlayers, getPlayerGameHistory } from '@/lib/db/players'
import { getPlayerGroupStats } from '@/lib/db/stats'
import { generatePlayerClaimLink } from '@/app/actions/invites'
import { linkPlayerToSelfAction, removePlayerAction } from '@/app/actions/players'
import { getClaimInviteUrl } from '@/lib/site-url'
import { calcWinRatePercent, calcAveragePerGame } from '@/lib/calculations/stats'
import { getPlayerWinCounts } from '@/lib/db/stats'
import type { Player, PlayerGroupStats, Currency } from '@/lib/domain/types'

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ groupId: string; playerId: string }>
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState<PlayerGroupStats | null>(null)
  const [gameHistory, setGameHistory] = useState<Awaited<ReturnType<typeof getPlayerGameHistory>>>([])
  const [winCount, setWinCount] = useState(0)
  const [currency, setCurrency] = useState<Currency>('ILS')
  const [canViewPrivate, setCanViewPrivate] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claimUrl, setClaimUrl] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [showRemove, setShowRemove] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [linkingSelf, setLinkingSelf] = useState(false)
  const [linkSelfSuccess, setLinkSelfSuccess] = useState(false)
  const [linkSelfError, setLinkSelfError] = useState('')

  useEffect(() => {
    params.then((p) => {
      setGroupId(p.groupId)
      setPlayerId(p.playerId)
    })
  }, [params])

  const fetchData = useCallback(async () => {
    if (!groupId || !playerId) return
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: membership } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle()
        setIsAdmin(!!membership && ['owner', 'manager'].includes(membership.role))
      }

      const allowed = await canViewPlayerPrivateData(supabase, playerId)
      setCanViewPrivate(allowed)

      const playersData = await getGroupPlayers(supabase, groupId)
      const found = playersData.find((p) => p.id === playerId) ?? null
      setPlayer(found)

      if (!allowed) {
        setStats(null)
        setGameHistory([])
        setWinCount(0)
        return
      }

      const [statsData, history, winCounts] = await Promise.all([
        getPlayerGroupStats(supabase, groupId).catch(() => []),
        getPlayerGameHistory(supabase, playerId, groupId).catch(() => []),
        getPlayerWinCounts(supabase, groupId).catch(() => new Map<string, number>()),
      ])

      const playerStats = statsData.find((s) => s.player_id === playerId) ?? null
      setStats(playerStats)
      setGameHistory(history)
      setWinCount(winCounts.get(playerId) ?? 0)

      if (history.length > 0) setCurrency('ILS')
    } catch (err) {
      console.error('Failed to load player:', err)
    } finally {
      setLoading(false)
    }
  }, [groupId, playerId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData() }, [fetchData])

  async function handleGenerateLink() {
    setGeneratingLink(true)
    setLinkError('')
    try {
      const { token } = await generatePlayerClaimLink(playerId, 168)
      setClaimUrl(getClaimInviteUrl(token))
    } catch {
      setLinkError(t.common.error)
    } finally {
      setGeneratingLink(false)
    }
  }

  async function handleLinkSelf() {
    setLinkingSelf(true)
    setLinkSelfError('')
    try {
      const result = await linkPlayerToSelfAction(playerId)
      if (!result.success) {
        if (result.error === 'player_already_linked') {
          setLinkSelfError(t.invites.playerAlreadyLinked)
        } else if (result.error === 'user_already_linked_in_group') {
          setLinkSelfError(t.invites.userAlreadyLinkedInGroup)
        } else {
          setLinkSelfError(t.common.error)
        }
        return
      }
      setLinkSelfSuccess(true)
      setPlayer((prev) =>
        prev && currentUserId ? { ...prev, linked_user_id: currentUserId } : prev,
      )
      setCanViewPrivate(true)
      await fetchData()
    } catch {
      setLinkSelfError(t.common.error)
    } finally {
      setLinkingSelf(false)
    }
  }

  async function handleRemovePlayer() {
    await removePlayerAction(groupId, playerId)
    router.push(`/groups/${groupId}`)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="..." showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  if (!player) {
    return (
      <>
        <PageHeader title={t.common.error} showBack />
        <main className="flex-1 px-4 py-4">
          <EmptyState message={t.common.noData} />
        </main>
      </>
    )
  }

  const symbol = t.currency[currency]
  const isLinked = !!player.linked_user_id
  const canLinkSelf =
    !isLinked && !!currentUserId && player.linked_user_id !== currentUserId
  const gamesPlayed = stats?.games_played ?? 0
  const totalBalance = stats?.total_balance ?? 0
  const avgPerGame = calcAveragePerGame(totalBalance, gamesPlayed)
  const winRate = calcWinRatePercent(winCount, gamesPlayed)

  return (
    <>
      <PageHeader title={player.display_name} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text-primary">{player.display_name}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isLinked
                  ? 'bg-positive/15 text-positive'
                  : 'bg-border text-text-muted'
              }`}
            >
              {isLinked ? t.players.linked : t.players.notLinked}
            </span>
          </div>
          {player.phone && (
            <a href={`tel:${player.phone}`} className="text-sm text-accent" dir="ltr">
              {player.phone}
            </a>
          )}
        </Card>

        {!canViewPrivate && (
          <p className="text-sm text-text-muted text-center px-2">
            {t.players.privateStats}
          </p>
        )}

        {canViewPrivate && gamesPlayed > 0 && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.stats.title}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label={t.stats.totalBalance}
                value={`${symbol}${totalBalance}`}
                positive={totalBalance >= 0}
              />
              <StatCard label={t.stats.gamesPlayed} value={String(gamesPlayed)} />
              <StatCard
                label={t.stats.averagePerGame}
                value={`${symbol}${Math.round(avgPerGame)}`}
                positive={avgPerGame >= 0}
              />
              <StatCard label={t.stats.winRate} value={`${winRate.toFixed(0)}%`} />
              {(stats?.biggest_win ?? 0) > 0 && (
                <StatCard
                  label={t.stats.biggestWin}
                  value={`${symbol}${stats!.biggest_win}`}
                  positive
                />
              )}
              {(stats?.biggest_loss ?? 0) < 0 && (
                <StatCard
                  label={t.stats.biggestLoss}
                  value={`${symbol}${Math.abs(stats!.biggest_loss)}`}
                  positive={false}
                />
              )}
            </div>
          </section>
        )}

        {canLinkSelf && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.players.linkSelf}
            </h2>
            <Card>
              <p className="text-sm text-text-secondary mb-3">{t.players.linkSelfDesc}</p>
              {linkSelfSuccess ? (
                <p className="text-sm text-positive text-center">{t.players.linkSelfSuccess}</p>
              ) : (
                <>
                  {linkSelfError && (
                    <p className="text-xs text-negative mb-2">{linkSelfError}</p>
                  )}
                  <Button fullWidth onClick={handleLinkSelf} disabled={linkingSelf}>
                    {linkingSelf ? t.players.linkingSelf : t.players.linkSelf}
                  </Button>
                </>
              )}
            </Card>
          </section>
        )}

        {!isLinked && isAdmin && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.players.generateClaimLink}
            </h2>
            <Card>
              <p className="text-sm text-text-secondary mb-3">{t.players.claimLinkDesc}</p>
              {claimUrl ? (
                <InviteLink
                  url={claimUrl}
                  title={t.invites.claimLinkTitle.replace('{name}', player.display_name)}
                  message={t.invites.claimLinkMessage.replace('{name}', player.display_name)}
                />
              ) : (
                <>
                  {linkError && <p className="text-xs text-negative mb-2">{linkError}</p>}
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={handleGenerateLink}
                    disabled={generatingLink}
                  >
                    {generatingLink ? t.players.generatingLink : t.players.generateClaimLink}
                  </Button>
                </>
              )}
            </Card>
          </section>
        )}

        {canViewPrivate && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.players.gameHistory}
            </h2>
            {gameHistory.length === 0 ? (
              <EmptyState message={t.players.noGameHistory} />
            ) : (
              <IosListGroup>
                {gameHistory.map((entry) => (
                  <IosListRow
                    key={entry.game_id}
                    href={`/groups/${groupId}/games/${entry.game_id}/results`}
                    trailing={
                      <div className="text-left shrink-0" dir="ltr">
                        <p
                          className={`font-semibold text-sm ${
                            entry.final_balance >= 0 ? 'text-positive' : 'text-negative'
                          }`}
                        >
                          {entry.final_balance >= 0 ? '+' : ''}{symbol}{entry.final_balance}
                        </p>
                        <p className="text-xs text-text-muted">
                          {symbol}{entry.total_buy_in} → {symbol}{entry.cash_out}
                        </p>
                      </div>
                    }
                  >
                    <p className="font-medium text-text-primary truncate">
                      {entry.game_name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(entry.game_date).toLocaleDateString('he-IL')}
                    </p>
                  </IosListRow>
                ))}
              </IosListGroup>
            )}
          </section>
        )}

        {isAdmin && (
          <div className="mt-auto pt-4 pb-2">
            <Button
              variant="danger"
              fullWidth
              onClick={() => setShowRemove(true)}
            >
              {t.players.removePlayer}
            </Button>
          </div>
        )}
      </main>

      <ConfirmSheet
        open={showRemove}
        onClose={() => setShowRemove(false)}
        title={t.players.removePlayer}
        message={t.players.removePlayerWarning}
        confirmLabel={t.players.removePlayerConfirm}
        onConfirm={handleRemovePlayer}
      />
    </>
  )
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <Card className="text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${
          positive === undefined
            ? 'text-text-primary'
            : positive
            ? 'text-positive'
            : 'text-negative'
        }`}
        dir="ltr"
      >
        {value}
      </p>
    </Card>
  )
}
