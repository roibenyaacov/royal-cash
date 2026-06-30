'use client'

import { useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InviteLink } from '@/components/ui/invite-link'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { Loading } from '@/components/ui/loading'
import { generateGameAccessLink } from '@/app/actions/invites'
import { getGameAccessUrl } from '@/lib/site-url'
import type { Player, Currency } from '@/lib/domain/types'

type Tab = 'existing' | 'new'

type Props = {
  open: boolean
  onClose: () => void
  gameId: string
  gameName: string
  defaultBuyIn: number
  currency: Currency
  playersNotInGame: Player[]
  playersAtZeroBuyIn: Player[]
  existingNames: string[]
  addingPlayerId: string | null
  savingNew: boolean
  onAddExisting: (playerId: string, withBuyIn: boolean) => Promise<void>
  onAddBuyInToPlayer: (playerId: string) => Promise<void>
  onAddNew: (
    name: string,
    addToGroup: boolean,
    withBuyIn: boolean,
  ) => Promise<void>
}

export function AddPlayerToGameSheet({
  open,
  onClose,
  gameId,
  gameName,
  defaultBuyIn,
  currency,
  playersNotInGame,
  playersAtZeroBuyIn,
  existingNames,
  addingPlayerId,
  savingNew,
  onAddExisting,
  onAddBuyInToPlayer,
  onAddNew,
}: Props) {
  const [tab, setTab] = useState<Tab>('existing')
  const [newName, setNewName] = useState('')
  const [addToGroup, setAddToGroup] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  const symbol = t.currency[currency]

  // Block names that collide with a player already in the game — two players
  // sharing a name on the table is impossible to tell apart afterwards.
  const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
  const trimmedNewName = newName.trim()
  const isDuplicateName =
    trimmedNewName.length > 0 &&
    existingNames.some((n) => normalizeName(n) === normalizeName(trimmedNewName))

  function handleClose() {
    setTab('existing')
    setNewName('')
    setAddToGroup(false)
    onClose()
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true)
    try {
      const { token } = await generateGameAccessLink(gameId, { expiresInHours: 24 })
      setInviteUrl(getGameAccessUrl(token))
    } catch (err) {
      console.error('Failed to generate game link:', err)
    } finally {
      setGeneratingInvite(false)
    }
  }

  async function handleSubmitNew(withBuyIn: boolean) {
    if (!trimmedNewName || savingNew || isDuplicateName) return
    await onAddNew(trimmedNewName, addToGroup, withBuyIn)
    setNewName('')
    setAddToGroup(false)
    setTab('existing')
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={t.players.addToGameTitle}>
      <div className="flex flex-col gap-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setTab('existing')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'existing'
                ? 'bg-accent/15 text-accent'
                : 'bg-surface text-text-muted'
            }`}
          >
            {t.players.addExistingTab}
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'new'
                ? 'bg-accent/15 text-accent'
                : 'bg-surface text-text-muted'
            }`}
          >
            {t.players.addNewTab}
          </button>
        </div>

        {tab === 'existing' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary">
              {t.players.selectToAdd}{' '}
              ({t.players.initialBuyIn.replace('{amount}', `${symbol}${defaultBuyIn}`)})
            </p>
            {playersNotInGame.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                {t.players.noPlayersToAdd}
              </p>
            ) : (
              <IosListGroup>
                {playersNotInGame.map((player) => (
                  <IosListRow
                    key={player.id}
                    onClick={() => onAddExisting(player.id, true)}
                    showChevron={false}
                    trailing={
                      addingPlayerId === player.id ? (
                        <span className="text-xs text-text-muted shrink-0">
                          {t.players.addingPlayer}
                        </span>
                      ) : (
                        <span className="text-accent text-[15px] font-medium shrink-0">
                          {t.players.addPlayerShort}
                        </span>
                      )
                    }
                  >
                    <span className="font-medium text-text-primary">
                      {player.display_name}
                    </span>
                  </IosListRow>
                ))}
              </IosListGroup>
            )}

            {playersAtZeroBuyIn.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-xs text-text-muted">{t.players.playersAtZeroBuyIn}</p>
                <IosListGroup>
                  {playersAtZeroBuyIn.map((player) => (
                    <IosListRow
                      key={player.id}
                      onClick={() => onAddBuyInToPlayer(player.id)}
                      showChevron={false}
                      trailing={
                        addingPlayerId === player.id ? (
                          <span className="text-xs text-text-muted shrink-0">
                            {t.players.addingPlayer}
                          </span>
                        ) : (
                          <span className="text-accent text-[15px] font-medium shrink-0">
                            {t.players.addFirstBuyIn}
                          </span>
                        )
                      }
                    >
                      <span className="font-medium text-text-primary">
                        {player.display_name}
                      </span>
                    </IosListRow>
                  ))}
                </IosListGroup>
              </div>
            )}
          </div>
        )}

        {tab === 'new' && (
          <div className="flex flex-col gap-4">
            <div>
              <Input
                label={t.players.playerName}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              {isDuplicateName && (
                <p className="mt-1.5 text-xs text-negative">
                  {t.players.duplicateName}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addToGroup}
                onChange={(e) => setAddToGroup(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border accent-accent"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t.players.addToGroupToggle}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t.players.addToGroupHint}
                </p>
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <Button
                fullWidth
                onClick={() => handleSubmitNew(true)}
                disabled={!trimmedNewName || savingNew || isDuplicateName}
              >
                {savingNew
                  ? t.common.loading
                  : `${t.players.addPlayer} (${symbol}${defaultBuyIn})`}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => handleSubmitNew(false)}
                disabled={!trimmedNewName || savingNew || isDuplicateName}
              >
                {savingNew ? t.common.loading : t.players.addWithoutBuyIn}
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {t.players.inviteToTable}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {t.players.inviteToTableDesc}
            </p>
          </div>
          {generatingInvite ? (
            <div className="flex justify-center py-2">
              <Loading />
            </div>
          ) : inviteUrl ? (
            <InviteLink
              url={inviteUrl}
              title={gameName}
              message={`${gameName} — ${t.invites.viewGame}`}
            />
          ) : (
            <Button variant="secondary" fullWidth onClick={handleGenerateInvite}>
              {t.invites.generateGameLink}
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
