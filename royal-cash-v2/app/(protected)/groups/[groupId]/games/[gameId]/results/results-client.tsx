'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateSummaryText } from '@/lib/calculations/summary'
import { finalizeGameAction } from '@/app/actions/games'
import type { Game, Player, GameResult, Settlement } from '@/lib/domain/types'

interface ResultsClientProps {
  groupId: string
  gameId: string
  game: Game
  players: Player[]
  results: GameResult[]
  settlements: Settlement[]
}

export default function ResultsClient({
  groupId,
  gameId,
  game,
  players,
  results,
  settlements,
}: ResultsClientProps) {
  const router = useRouter()
  const [finalizing, setFinalizing] = useState(false)

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const getName = (id: string) => playerNames.get(id) ?? id

  const sorted = useMemo(
    () => [...results].sort((a, b) => b.final_balance - a.final_balance),
    [results],
  )

  const currencyKey = (game.currency ?? 'ILS') as 'ILS' | 'USD' | 'EUR'
  const symbol = t.currency[currencyKey]
  const isFinalized = !!game.finalized_at

  const finalizeAndNavigate = useCallback(async () => {
    if (finalizing) return
    setFinalizing(true)
    try {
      await finalizeGameAction(gameId, groupId)
      router.push(`/groups/${groupId}`)
    } catch (err) {
      console.error('Failed to finalize game:', err)
      setFinalizing(false)
    }
  }, [gameId, groupId, finalizing, router])

  const handleShareAndClose = useCallback(async () => {
    if (finalizing) return

    if (isFinalized) {
      router.push(`/groups/${groupId}`)
      return
    }

    const settlementTransfers = settlements.map((s) => ({
      from: s.from_player_id,
      to: s.to_player_id,
      amount: s.amount,
    }))

    const text = generateSummaryText(
      { name: game.name },
      results,
      settlementTransfers,
      playerNames,
      'he',
    )

    let didShare = false

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${t.summary.header} – ${game.name}`,
          text,
        })
        didShare = true
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }

    if (!didShare) {
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        console.error('Failed to copy summary:', err)
        return
      }
    }

    await finalizeAndNavigate()
  }, [game, finalizing, isFinalized, settlements, results, playerNames, groupId, router, finalizeAndNavigate])

  if (results.length === 0) {
    return (
      <>
        <PageHeader title={t.results.title} showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">{t.common.noData}</p>
        </div>
      </>
    )
  }

  const buttonLabel = finalizing
    ? t.results.savingGame
    : isFinalized
      ? t.results.backToGroup
      : t.results.shareAndClose

  return (
    <>
      <PageHeader title={t.results.title} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-5">
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.results.title}
          </h2>
          <div className="flex flex-col gap-2">
            {sorted.map((r) => (
              <Card key={r.player_id}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">
                    {getName(r.player_id)}
                  </span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      r.final_balance >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                    dir="ltr"
                  >
                    {symbol}
                    {Math.abs(r.final_balance)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-text-muted">
                  <span>
                    {t.results.buyIn}:{' '}
                    <span dir="ltr">
                      {symbol}
                      {r.total_buy_in}
                    </span>
                  </span>
                  <span>
                    {t.results.cashOut}:{' '}
                    <span dir="ltr">
                      {symbol}
                      {r.cash_out}
                    </span>
                  </span>
                  {r.expense_credit > 0 && (
                    <span>
                      {t.results.food}:{' '}
                      <span dir="ltr">
                        +{symbol}
                        {r.expense_credit}
                      </span>
                    </span>
                  )}
                  {r.expense_debt > 0 && r.expense_credit === 0 && (
                    <span>
                      {t.results.food}:{' '}
                      <span dir="ltr">
                        -{symbol}
                        {r.expense_debt}
                      </span>
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {settlements.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              {t.results.settlements}
            </h2>
            <div className="flex flex-col gap-2">
              {settlements.map((s) => (
                <Card key={s.id} elevated>
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary">
                      {getName(s.from_player_id)}{' '}
                      <span className="text-text-muted">{t.results.paysTo}</span>{' '}
                      {getName(s.to_player_id)}
                    </span>
                    <span className="font-bold text-accent font-mono" dir="ltr">
                      {symbol}{s.amount}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-3 mt-auto pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={handleShareAndClose}
            disabled={finalizing}
          >
            {buttonLabel}
          </Button>
        </div>
      </main>
    </>
  )
}
