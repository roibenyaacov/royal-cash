'use client'

import { useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { InviteLink } from '@/components/ui/invite-link'
import { generatePlayerClaimLink } from '@/app/actions/invites'
import { linkPlayerToSelfAction } from '@/app/actions/players'
import { getClaimInviteUrl } from '@/lib/site-url'
import type { Player, PlayerGroupStats, Currency } from '@/lib/domain/types'

type Props = {
  player: Player | null
  stats?: PlayerGroupStats
  currency: Currency
  groupId: string
  currentUserId: string | null
  canViewPrivate: boolean
  onClose: () => void
  onPlayerLinked?: (player: Player) => void
}

export function PlayerSheet({
  player,
  stats,
  currency,
  groupId,
  currentUserId,
  canViewPrivate,
  onClose,
  onPlayerLinked,
}: Props) {
  const [claimUrl, setClaimUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [linkingSelf, setLinkingSelf] = useState(false)
  const [linkSelfSuccess, setLinkSelfSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerateLink() {
    if (!player) return
    setGenerating(true)
    setError('')
    try {
      const { token } = await generatePlayerClaimLink(player.id, 168) // 7 days
      setClaimUrl(getClaimInviteUrl(token))
    } catch {
      setError(t.common.error)
    } finally {
      setGenerating(false)
    }
  }

  async function handleLinkSelf() {
    if (!player) return
    setLinkingSelf(true)
    setError('')
    try {
      const result = await linkPlayerToSelfAction(player.id)
      if (!result.success) {
        if (result.error === 'player_already_linked') {
          setError(t.invites.playerAlreadyLinked)
        } else if (result.error === 'user_already_linked_in_group') {
          setError(t.invites.userAlreadyLinkedInGroup)
        } else {
          setError(t.common.error)
        }
        return
      }

      setLinkSelfSuccess(true)
      onPlayerLinked?.({ ...player, linked_user_id: currentUserId })
    } catch {
      setError(t.common.error)
    } finally {
      setLinkingSelf(false)
    }
  }

  function handleClose() {
    setClaimUrl(null)
    setError('')
    setLinkSelfSuccess(false)
    onClose()
  }

  if (!player) return null

  const isLinked = !!player.linked_user_id
  const canLinkSelf =
    !isLinked &&
    !!currentUserId &&
    player.linked_user_id !== currentUserId

  const symbol = t.currency[currency]

  return (
    <BottomSheet open={!!player} onClose={handleClose} title={player.display_name}>
      <div className="flex flex-col gap-5">
        {/* Linked status */}
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              isLinked
                ? 'bg-positive/15 text-positive'
                : 'bg-border text-text-muted'
            }`}
          >
            {isLinked ? t.players.linked : t.players.notLinked}
          </span>
          {player.phone && (
            <a
              href={`tel:${player.phone}`}
              className="text-sm text-accent"
              dir="ltr"
            >
              {player.phone}
            </a>
          )}
        </div>

        {/* Stats — own linked account only */}
        {canViewPrivate && stats && stats.games_played > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <StatCell
              label={t.stats.totalBalance}
              value={`${symbol}${stats.total_balance}`}
              positive={stats.total_balance >= 0}
            />
            <StatCell
              label={t.stats.gamesPlayed}
              value={String(stats.games_played)}
            />
            <StatCell
              label={t.stats.averagePerGame}
              value={`${symbol}${Math.round(stats.total_balance / stats.games_played)}`}
              positive={stats.total_balance >= 0}
            />
          </div>
        )}

        {!canViewPrivate && (
          <p className="text-sm text-text-muted text-center">{t.players.privateStats}</p>
        )}

        {canLinkSelf && (
          <div className="flex flex-col gap-3 border border-accent/30 rounded-xl p-4 bg-accent/5">
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {t.players.linkSelf}
              </p>
              <p className="text-xs text-text-muted">{t.players.linkSelfDesc}</p>
            </div>
            {linkSelfSuccess ? (
              <p className="text-sm text-positive text-center">{t.players.linkSelfSuccess}</p>
            ) : (
              <>
                {error && <p className="text-xs text-negative">{error}</p>}
                <Button
                  fullWidth
                  onClick={handleLinkSelf}
                  disabled={linkingSelf}
                >
                  {linkingSelf ? t.players.linkingSelf : t.players.linkSelf}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Claim link section */}
        {!isLinked && (
          <div className="flex flex-col gap-3 border border-border rounded-xl p-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {t.players.generateClaimLink}
              </p>
              <p className="text-xs text-text-muted">{t.players.claimLinkDesc}</p>
            </div>

            {claimUrl ? (
              <InviteLink
                url={claimUrl}
                title={t.invites.claimLinkTitle.replace('{name}', player.display_name)}
                message={t.invites.claimLinkMessage.replace('{name}', player.display_name)}
              />
            ) : (
              <>
                {error && !canLinkSelf && <p className="text-xs text-negative">{error}</p>}
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleGenerateLink}
                  disabled={generating}
                >
                  {generating ? t.players.generatingLink : t.players.generateClaimLink}
                </Button>
              </>
            )}
          </div>
        )}

        {canViewPrivate && (
          <Link href={`/groups/${groupId}/players/${player.id}`} onClick={handleClose}>
            <Button variant="secondary" fullWidth>
              {t.players.viewProfile} →
            </Button>
          </Link>
        )}
      </div>
    </BottomSheet>
  )
}

function StatCell({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="bg-surface-elevated rounded-lg p-2 text-center">
      <p className="text-[10px] text-text-muted mb-0.5">{label}</p>
      <p
        className={`text-sm font-bold ${
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
    </div>
  )
}
