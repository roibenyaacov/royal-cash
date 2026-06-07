'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { getGame, getGamePlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameExpenses, getExpenseParticipants } from '@/lib/db/expenses'
import { calcAllPlayerBalances } from '@/lib/calculations/balance'
import { calcSettlements } from '@/lib/calculations/settlement'
import { validateGameForClose } from '@/lib/calculations/validation'
import { closeGameAction } from '@/app/actions/games'
import type {
  Game,
  Player,
  BuyIn,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'

export default function CloseGamePage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [gameId, setGameId] = useState('')
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [buyIns, setBuyIns] = useState<BuyIn[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseParticipants, setExpenseParticipants] = useState<ExpenseParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [cashOutValues, setCashOutValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    params.then((p) => {
      setGroupId(p.groupId)
      setGameId(p.gameId)
    })
  }, [params])

  const fetchData = useCallback(async () => {
    if (!gameId || !groupId) return
    const supabase = createClient()

    try {
      const [gameData, gamePlayersData, allPlayers, buyInsData, expensesData] =
        await Promise.all([
          getGame(supabase, gameId),
          getGamePlayers(supabase, gameId),
          getGroupPlayers(supabase, groupId),
          getGameBuyIns(supabase, gameId),
          getGameExpenses(supabase, gameId),
        ])

      setGame(gameData)
      setBuyIns(buyInsData)
      setExpenses(expensesData)

      const gamePlayerIds = new Set(gamePlayersData.map((gp) => gp.player_id))
      const gamePlayers = allPlayers.filter((p) => gamePlayerIds.has(p.id))
      setPlayers(gamePlayers)

      const initial: Record<string, string> = {}
      for (const p of gamePlayers) initial[p.id] = ''
      setCashOutValues(initial)

      if (expensesData.length > 0) {
        const epData = await getExpenseParticipants(
          supabase,
          expensesData.map((e) => e.id),
        )
        setExpenseParticipants(epData)
      }
    } catch (err) {
      console.error('Failed to load close data:', err)
    } finally {
      setLoading(false)
    }
  }, [gameId, groupId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
  const symbol = game ? t.currency[game.currency] : '₪'
  const difference = totalCashOuts - totalBuyIns

  const handleCalculate = async () => {
    if (!game || !gameId || saving) return

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
      setErrors(validation.errors)
      return
    }

    setErrors([])
    setSaving(true)

    try {
      const results = calcAllPlayerBalances(
        playerIds,
        buyIns,
        cashOuts,
        expenses,
        participantsByExpense,
        gameId,
      )

      const balances = results.map((r) => ({
        playerId: r.player_id,
        amount: r.final_balance,
      }))
      const settlements = calcSettlements(balances)

      await closeGameAction(gameId, cashOutAmounts, results, settlements)

      router.push(`/groups/${groupId}/games/${gameId}/results`)
    } catch (err) {
      console.error('Failed to close game:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !game) {
    return (
      <>
        <PageHeader title={t.close.title} showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
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
                      כניסות: {symbol}{playerBuyIns}
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
              <span className="text-warning">הפרש</span>
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
