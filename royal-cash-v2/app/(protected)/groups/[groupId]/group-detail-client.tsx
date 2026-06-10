'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { Input } from '@/components/ui/input'
import { InviteLink } from '@/components/ui/invite-link'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { PlusIcon } from '@/components/ui/header-icon-button'
import { PlayerSheet } from '@/components/groups/player-sheet'
import { WinPodium } from '@/components/groups/win-podium'
import { Loading } from '@/components/ui/loading'
import { createPlayerAction } from '@/app/actions/players'
import { generateGroupInviteLink } from '@/app/actions/invites'
import { archiveGroupAction } from '@/app/actions/groups'
import { getGroupInviteUrl } from '@/lib/site-url'
import type {
  Player,
  Game,
  Group,
  PlayerGroupStats,
  GroupWinRecord,
  Currency,
} from '@/lib/domain/types'

function PlayerAvatar({ name }: { name: string }) {
  return (
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-surface border border-border">
      <span className="text-accent font-bold text-lg leading-none">
        {name.charAt(0)}
      </span>
    </div>
  )
}

interface GroupDetailClientProps {
  groupId: string
  group: Group
  initialPlayers: Player[]
  initialGames: Game[]
  playerStats: PlayerGroupStats[]
  winRecords: GroupWinRecord[]
  currentUserId: string | null
}

export default function GroupDetailClient({
  groupId,
  group,
  initialPlayers,
  initialGames,
  playerStats,
  winRecords,
  currentUserId,
}: GroupDetailClientProps) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const isOwner = currentUserId === group.owner_id

  const statsByPlayer = useMemo(
    () => new Map(playerStats.map((s) => [s.player_id, s])),
    [playerStats],
  )

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const activeGames = initialGames.filter((g) => g.status === 'active')
  const historyGames = initialGames.filter((g) => g.status === 'closed' && g.finalized_at)
  const defaultCurrency = (initialGames[0]?.currency ?? 'ILS') as Currency

  const selectedPlayerCanViewPrivate =
    !!selectedPlayer &&
    !!currentUserId &&
    selectedPlayer.linked_user_id === currentUserId

  const handleAddPlayer = async () => {
    if (!playerName.trim() || saving) return
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
      setInviteUrl(getGroupInviteUrl(token))
    } catch (err) {
      console.error('Failed to generate invite:', err)
    } finally {
      setGeneratingInvite(false)
    }
  }

  async function handleArchiveGroup() {
    await archiveGroupAction(groupId)
    router.push('/groups')
  }

  return (
    <>
      <PageHeader title={group.name} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto min-h-0">
        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowAddPlayer(true)}
            className="flex flex-row items-center justify-center gap-2 py-3 px-2 rounded-[10px] border border-border bg-surface text-[14px] font-medium text-text-primary active:bg-surface-elevated transition-colors min-h-[48px] whitespace-nowrap"
          >
            <PlusIcon className="w-[18px] h-[18px] text-accent shrink-0" />
            <span className="truncate">{t.players.addPlayer}</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowInvite(true); if (!inviteUrl) handleGenerateInvite() }}
            className="flex flex-row items-center justify-center gap-2 py-3 px-2 rounded-[10px] border border-border bg-surface text-[14px] font-medium text-accent active:bg-surface-elevated transition-colors min-h-[48px] whitespace-nowrap"
          >
            <LinkIcon />
            <span className="truncate">{t.invites.inviteNav}</span>
          </button>
          {players.length >= 2 && (
            <button
              type="button"
              onClick={() => router.push(`/groups/${groupId}/games/new`)}
              className="col-span-2 py-3.5 rounded-[10px] font-bold text-[15px] text-black active:opacity-85 transition-opacity min-h-[48px]"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%)' }}
            >
              {t.game.newGame}
            </button>
          )}
        </section>

        {activeGames.length > 0 && (
          <IosListGroup>
            {activeGames.map((g) => (
              <IosListRow
                key={g.id}
                href={`/groups/${groupId}/games/${g.id}`}
                className="py-3.5 min-h-[56px]"
              >
                <p className="text-[17px] font-medium text-text-primary truncate leading-snug">
                  {g.name}
                </p>
              </IosListRow>
            ))}
          </IosListGroup>
        )}

        {players.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">{t.common.noData}</p>
        ) : (
          <IosListGroup>
            {players.map((p) => (
              <IosListRow
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                leading={<PlayerAvatar name={p.display_name} />}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">
                    {p.display_name}
                  </span>
                  {!!p.linked_user_id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" />
                  )}
                </div>
              </IosListRow>
            ))}
          </IosListGroup>
        )}

        {winRecords.length > 0 && (
          <section className="pt-2">
            <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
              {t.groups.podiumTitle}
            </p>
            <WinPodium
              records={winRecords}
              playerNames={playerNames}
              currency={defaultCurrency}
            />
          </section>
        )}

        {historyGames.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
              {t.game.gameHistory}
            </p>
            <IosListGroup>
              {historyGames.map((g) => (
                <IosListRow
                  key={g.id}
                  href={`/groups/${groupId}/games/${g.id}/results`}
                  leading={
                    <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center shrink-0">
                      <span className="text-[11px] text-text-muted font-medium leading-none">
                        {new Date(g.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  }
                >
                  <p className="font-medium text-text-primary text-sm truncate">{g.name}</p>
                </IosListRow>
              ))}
            </IosListGroup>
          </section>
        )}

        {isOwner && (
          <section className="mt-auto pt-8 pb-2">
            <button
              type="button"
              onClick={() => setShowArchive(true)}
              className="w-full py-3 rounded-[10px] border border-negative/30 bg-negative/5 text-[14px] font-medium text-negative active:bg-negative/10 transition-colors min-h-[44px]"
            >
              {t.groups.archiveGroup}
            </button>
          </section>
        )}
      </main>

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
          <Button fullWidth onClick={handleAddPlayer} disabled={!playerName.trim() || saving}>
            {saving ? t.common.loading : t.players.addPlayer}
          </Button>
        </div>
      </BottomSheet>

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
              message={t.invites.groupInviteMessage.replace('{groupName}', group.name)}
            />
          ) : (
            <Button fullWidth onClick={handleGenerateInvite}>
              {t.invites.generateGroupLink}
            </Button>
          )}
        </div>
      </BottomSheet>

      <PlayerSheet
        player={selectedPlayer}
        stats={selectedPlayer ? statsByPlayer.get(selectedPlayer.id) : undefined}
        currency={defaultCurrency}
        groupId={groupId}
        currentUserId={currentUserId}
        isGroupAdmin={isOwner}
        canViewPrivate={selectedPlayerCanViewPrivate}
        onClose={() => setSelectedPlayer(null)}
        onPlayerLinked={(linked) => {
          setPlayers((prev) =>
            prev.map((p) => (p.id === linked.id ? linked : p)),
          )
          setSelectedPlayer(linked)
        }}
      />

      <ConfirmSheet
        open={showArchive}
        onClose={() => setShowArchive(false)}
        title={t.groups.archiveGroup}
        message={t.groups.archiveGroupWarning}
        confirmLabel={t.groups.archiveGroupConfirm}
        onConfirm={handleArchiveGroup}
        requireTyping={group.name}
      />
    </>
  )
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="w-[18px] h-[18px] shrink-0"
      aria-hidden
    >
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M8.5 3.5h4v4" />
      <path d="M12.5 3.5 6.5 9.5" />
      <path d="M3.5 6.5v6h6" />
    </svg>
  )
}
