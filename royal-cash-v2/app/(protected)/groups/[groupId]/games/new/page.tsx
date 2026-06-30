'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { getGroupPlayers } from '@/lib/db/players'
import { createGameAction } from '@/app/actions/games'
import type { Currency, Player } from '@/lib/domain/types'

export default function CreateGamePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [gameName, setGameName] = useState('')
  const [defaultBuyIn, setDefaultBuyIn] = useState('')
  const [currency] = useState<Currency>('ILS')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  // Money managers: false = everyone manages (default), true = only a subset.
  const [restrictManagers, setRestrictManagers] = useState(false)
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    params.then((p) => setGroupId(p.groupId))
  }, [params])

  useEffect(() => {
    if (!groupId) return
    async function load() {
      const supabase = createClient()
      try {
        const data = await getGroupPlayers(supabase, groupId)
        setPlayers(data)
        setSelectedPlayerIds(new Set(data.map((p) => p.id)))
      } catch (err) {
        console.error('Failed to load players:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId])

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // A player who's no longer playing can't be a money manager.
    setManagerIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleManager = (id: string) => {
    setManagerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const managerPlayerIds = Array.from(managerIds).filter((id) =>
    selectedPlayerIds.has(id),
  )

  const handleStart = async () => {
    if (
      !gameName.trim() ||
      !defaultBuyIn ||
      selectedPlayerIds.size < 2 ||
      saving ||
      (restrictManagers && managerPlayerIds.length === 0)
    )
      return
    setSaving(true)

    try {
      const game = await createGameAction(
        groupId,
        gameName.trim(),
        parseInt(defaultBuyIn),
        currency,
        Array.from(selectedPlayerIds),
        restrictManagers ? managerPlayerIds : [],
      )

      router.push(`/groups/${groupId}/games/${game.id}`)
    } catch (err) {
      console.error('Failed to create game:', err)
    } finally {
      setSaving(false)
    }
  }

  const canStart =
    gameName.trim() &&
    defaultBuyIn &&
    selectedPlayerIds.size >= 2 &&
    (!restrictManagers || managerPlayerIds.length > 0)

  if (loading) {
    return (
      <>
        <PageHeader title={t.game.newGame} showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t.game.newGame} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-5">
        <Input
          label={t.game.gameName}
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="שישי בערב"
          autoFocus
        />

        <MoneyInput
          label={t.game.defaultBuyIn}
          value={defaultBuyIn}
          onChange={(e) => setDefaultBuyIn(e.target.value)}
          currency={currency}
          placeholder="50"
        />

        <div>
          <h3 className="text-sm text-text-secondary mb-2">
            {t.game.whoPlaysToday}
          </h3>
          {players.length === 0 ? (
            <p className="text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((p) => {
                const selected = selectedPlayerIds.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`
                      rounded-full px-4 py-2 text-sm transition-colors
                      border min-h-[40px]
                      ${
                        selected
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'bg-surface-elevated border-border text-text-secondary'
                      }
                    `}
                  >
                    {p.display_name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm text-text-secondary mb-2">
            {t.game.managersQuestion}
          </h3>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setRestrictManagers(false)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                !restrictManagers
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-text-muted'
              }`}
            >
              {t.game.managersEveryone}
            </button>
            <button
              type="button"
              onClick={() => setRestrictManagers(true)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                restrictManagers
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-text-muted'
              }`}
            >
              {t.game.managersSome}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1.5">{t.game.managersHint}</p>

          {restrictManagers && (
            <div className="mt-3">
              <p className="text-xs text-text-secondary mb-2">
                {t.game.selectManagers}
              </p>
              <div className="flex flex-wrap gap-2">
                {players
                  .filter((p) => selectedPlayerIds.has(p.id))
                  .map((p) => {
                    const isManager = managerIds.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleManager(p.id)}
                        className={`rounded-full px-4 py-2 text-sm transition-colors border min-h-[40px] ${
                          isManager
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'bg-surface-elevated border-border text-text-secondary'
                        }`}
                      >
                        {p.display_name}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={handleStart}
            disabled={!canStart || saving}
          >
            {saving ? t.common.loading : t.game.startGame}
          </Button>
        </div>
      </main>
    </>
  )
}
