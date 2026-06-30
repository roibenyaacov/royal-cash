'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import { validateGameForClose } from '@/lib/calculations/validation'
import { translateValidationErrors } from '@/lib/i18n/translate-validation'
import { closeGameAction } from '@/app/actions/games'
import type {
  Game,
  Player,
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'

interface CloseGameClientProps {
  groupId: string
  gameId: string
  game: Game
  players: Player[]
  buyIns: BuyIn[]
  cashOuts: CashOut[]
  expenses: Expense[]
  expenseParticipants: ExpenseParticipant[]
}

export default function CloseGameClient({
  groupId,
  gameId,
  game,
  players,
  buyIns,
  cashOuts,
  expenses,
  expenseParticipants,
}: CloseGameClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  // Pre-fill any cash-out already recorded mid-game, so the close screen
  // starts from those amounts instead of blank — the two flows reconcile.
  const [cashOutValues, setCashOutValues] = useState<Record<string, string>>(
    () => {
      const byPlayer = new Map(cashOuts.map((c) => [c.player_id, c.amount]))
      return Object.fromEntries(
        players.map((p) => [
          p.id,
          byPlayer.has(p.id) ? String(byPlayer.get(p.id)) : '',
        ]),
      )
    },
  )
  const [errors, setErrors] = useState<string[]>([])

  const participantsByExpense = useMemo(() => {
    const map = new Map<string, ExpenseParticipant[]>()
    for (const ep of expenseParticipants) {
      const list = map.get(ep.expense_id) ?? []
      list.push(ep)
      map.set(ep.expense_id, list)
    }
    return map
  }, [expenseParticipants])

  const totalBuyIns = buyIns.reduce((s, b) => s + b.amount, 0)
  const totalCashOuts = Object.values(cashOutValues).reduce(
    (s, v) => s + (parseInt(v) || 0),
    0,
  )
  const symbol = t.currency[game.currency]
  const difference = totalCashOuts - totalBuyIns

  const getCloseErrorMessage = (err: unknown): string => {
    if (!(err instanceof Error)) return t.close.failed
    if (err.message === 'validation_failed' || err.message === 'roster_mismatch') {
      return t.close.staleRoster
    }
    return t.close.failed
  }

  const handleCalculate = async () => {
    if (saving) return

    const playerIds = players.map((p) => p.id)
    const cashOutAmounts = players.map((p) => ({
      playerId: p.id,
      amount: parseInt(cashOutValues[p.id]) || 0,
    }))

    const cashOuts = cashOutAmounts.map((co) => ({
      id: crypto.randomUUID(),
      game_id: gameId,
      player_id: co.playerId,
      amount: co.amount,
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const validation = validateGameForClose(
      playerIds,
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
    )

    if (!validation.valid) {
      setErrors(
        translateValidationErrors(validation.errors, t, (id) => {
          const player = players.find((p) => p.id === id)
          return player?.display_name ?? id
        }),
      )
      return
    }

    setErrors([])
    setSaving(true)

    try {
      // Final balances + settlements are recomputed and validated on the
      // server inside closeGameAction. The client only submits the
      // human-entered cash-out amounts.
      await closeGameAction(gameId, cashOutAmounts)
      router.refresh()
      router.replace(`/groups/${groupId}/games/${gameId}/results`)
    } catch (err) {
      console.error('Failed to close game:', err)
      setErrors([getCloseErrorMessage(err)])
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={t.close.title} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        <p className="text-text-secondary">{t.close.howMuchEachLeft}</p>

        <div className="flex flex-col gap-3">
          {players.map((player) => {
            const playerBuyIns = buyIns
              .filter((b) => b.player_id === player.id)
              .reduce((s, b) => s + b.amount, 0)

            return (
              <Card key={player.id}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">
                      {player.display_name}
                    </span>
                    <span className="text-sm text-text-muted">
                      {t.close.playerBuyIns.replace(
                        '{amount}',
                        `${symbol}${playerBuyIns}`,
                      )}
                    </span>
                  </div>
                  <MoneyInput
                    value={cashOutValues[player.id] ?? ''}
                    onChange={(e) =>
                      setCashOutValues((prev) => ({
                        ...prev,
                        [player.id]: e.target.value,
                      }))
                    }
                    currency={game.currency}
                    placeholder="0"
                  />
                </div>
              </Card>
            )
          })}
        </div>

        <Card elevated>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t.close.totalBuyIns}</span>
            <span className="text-text-primary font-mono" dir="ltr">
              {symbol}{totalBuyIns}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-text-secondary">{t.close.totalCashOuts}</span>
            <span className="text-text-primary font-mono" dir="ltr">
              {symbol}{totalCashOuts}
            </span>
          </div>
          {difference !== 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-warning">{t.close.difference}</span>
              <span className="text-warning font-mono" dir="ltr">
                {difference > 0 ? '+' : ''}{difference}
              </span>
            </div>
          )}
        </Card>

        {errors.length > 0 && (
          <div className="bg-negative/10 rounded-[var(--radius-card)] p-3">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-negative">
                {err}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-auto pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={handleCalculate}
            disabled={saving}
          >
            {saving ? t.common.loading : t.close.calculateResults}
          </Button>
        </div>
      </main>
    </>
  )
}
