'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { MoneyInput } from '@/components/ui/money-input'
import { Button } from '@/components/ui/button'
import { validateGameForClose } from '@/lib/calculations/validation'
import { translateValidationErrors } from '@/lib/i18n/translate-validation'
import {
  closeGameAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '@/app/actions/games'
import {
  ExpenseSheet,
  type ExpenseDraft,
} from '@/components/expenses/expense-sheet'
import { ExpenseListSheet } from '@/components/expenses/expense-list-sheet'
import { ChevronForward } from '@/components/ui/chevron'
import { useLocale } from '@/lib/i18n/locale-context'
import { createClient } from '@/lib/supabase/client'
import { getGameRosterPlayers } from '@/lib/db/games'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameCashOuts } from '@/lib/db/cashouts'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import { calcPlayerBuyIns } from '@/lib/calculations/buy-ins'
import { useGameRealtime } from '@/hooks/use-game-realtime'
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
  initialPlayers: Player[]
  initialBuyIns: BuyIn[]
  initialCashOuts: CashOut[]
  initialExpenses: Expense[]
  initialExpenseParticipants: ExpenseParticipant[]
}

type CloseGameData = {
  players: Player[]
  buyIns: BuyIn[]
  expenses: Expense[]
  expenseParticipants: ExpenseParticipant[]
}

export default function CloseGameClient({
  groupId,
  gameId,
  game,
  initialPlayers,
  initialBuyIns,
  initialCashOuts,
  initialExpenses,
  initialExpenseParticipants,
}: CloseGameClientProps) {
  const router = useRouter()
  const { dir } = useLocale()
  const [saving, setSaving] = useState(false)
  const [showExpenseList, setShowExpenseList] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [expenseError, setExpenseError] = useState('')
  const [expenseBusy, setExpenseBusy] = useState(false)
  const [data, setData] = useState<CloseGameData>({
    players: initialPlayers,
    buyIns: initialBuyIns,
    expenses: initialExpenses,
    expenseParticipants: initialExpenseParticipants,
  })
  // The server-rendered props can already be stale by the time this screen is
  // read (buy-ins added seconds earlier, a cached RSC payload from an earlier
  // visit). Until the first client refetch lands, closing is held back so the
  // cash-outs are never balanced against a total that isn't the real pot.
  const [synced, setSynced] = useState(false)
  const { players, buyIns, expenses, expenseParticipants } = data
  // Pre-fill any cash-out already recorded mid-game, so the close screen
  // starts from those amounts instead of blank — the two flows reconcile.
  const [cashOutValues, setCashOutValues] = useState<Record<string, string>>(
    () => {
      const byPlayer = new Map(initialCashOuts.map((c) => [c.player_id, c.amount]))
      return Object.fromEntries(
        initialPlayers.map((p) => [
          p.id,
          byPlayer.has(p.id) ? String(byPlayer.get(p.id)) : '',
        ]),
      )
    },
  )
  const [errors, setErrors] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    try {
      const [
        rosterPlayers,
        buyInsData,
        cashOutsData,
        { expenses: expensesData, participants },
      ] = await Promise.all([
        getGameRosterPlayers(supabase, gameId),
        getGameBuyIns(supabase, gameId),
        getGameCashOuts(supabase, gameId),
        getGameExpensesWithParticipants(supabase, gameId),
      ])

      // Same roster rule as the server: players with at least one buy-in.
      const seated = rosterPlayers.filter(
        (p) => calcPlayerBuyIns(buyInsData, p.id) > 0,
      )

      setData({
        players: seated,
        buyIns: buyInsData,
        expenses: expensesData,
        expenseParticipants: participants,
      })

      // Never overwrite an amount the user is in the middle of typing — only
      // seed inputs for players who joined the table since the last render.
      setCashOutValues((prev) => {
        const recorded = new Map(cashOutsData.map((c) => [c.player_id, c.amount]))
        return Object.fromEntries(
          seated.map((p) => [
            p.id,
            p.id in prev
              ? prev[p.id]
              : recorded.has(p.id)
                ? String(recorded.get(p.id))
                : '',
          ]),
        )
      })
    } catch (err) {
      console.error('Failed to refresh close screen:', err)
    } finally {
      setSynced(true)
    }
  }, [gameId])

  useGameRealtime(gameId, fetchData, { refreshOnMount: true })

  const participantsByExpense = useMemo(() => {
    const map = new Map<string, ExpenseParticipant[]>()
    for (const ep of expenseParticipants) {
      const list = map.get(ep.expense_id) ?? []
      list.push(ep)
      map.set(ep.expense_id, list)
    }
    return map
  }, [expenseParticipants])

  const editingExpense = useMemo<ExpenseDraft | null>(() => {
    if (!editingExpenseId) return null
    const expense = expenses.find((e) => e.id === editingExpenseId)
    if (!expense) return null
    return {
      expense,
      participants: expenseParticipants.filter(
        (p) => p.expense_id === editingExpenseId,
      ),
    }
  }, [editingExpenseId, expenses, expenseParticipants])

  // Corrections on this screen are rare and the amounts here are what the
  // settlement is about to be built from, so these refetch rather than patch
  // state optimistically: the totals shown must be the stored ones.
  const handleUpdateExpense = async (
    expenseId: string,
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: Expense['split_type'],
    participants: { playerId: string; amountOwed: number }[],
  ) => {
    if (expenseBusy) return
    setExpenseError('')
    setEditingExpenseId(null)
    setExpenseBusy(true)
    try {
      await updateExpenseAction(
        gameId,
        expenseId,
        paidByPlayerId,
        amount,
        description,
        splitType,
        participants,
      )
      await fetchData()
    } catch (err) {
      console.error('Failed to update expense:', err)
      setExpenseError(
        err instanceof Error && err.message === 'expense_edit_needs_migration'
          ? t.expenses.editNeedsMigration
          : t.expenses.editFailed,
      )
    } finally {
      setExpenseBusy(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (expenseBusy) return
    setExpenseError('')
    setEditingExpenseId(null)
    setShowExpenseList(false)
    setExpenseBusy(true)
    try {
      await deleteExpenseAction(gameId, expenseId)
      await fetchData()
    } catch (err) {
      console.error('Failed to delete expense:', err)
      setExpenseError(
        err instanceof Error && err.message === 'expense_edit_needs_migration'
          ? t.expenses.editNeedsMigration
          : t.expenses.deleteFailed,
      )
    } finally {
      setExpenseBusy(false)
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
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
          {/* Expenses feed the settlements but had no place on this screen,
              so a wrong one could only be found after the results were out.
              The row is the way in to correcting it, right where the numbers
              are being checked. */}
          {totalExpenses > 0 && (
            <button
              type="button"
              onClick={() => setShowExpenseList(true)}
              className="flex justify-between items-center w-full text-sm mt-1
                min-h-[36px] -mx-1 px-1 rounded-lg
                active:bg-surface/60 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-text-secondary">
                {t.game.expensesTotal}
                <ChevronForward
                  className={dir === 'ltr' ? 'scale-x-[-1]' : undefined}
                />
              </span>
              <span className="text-text-primary font-mono" dir="ltr">
                {symbol}{totalExpenses}
              </span>
            </button>
          )}
          {difference !== 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-warning">{t.close.difference}</span>
              <span className="text-warning font-mono" dir="ltr">
                {difference > 0 ? '+' : ''}{difference}
              </span>
            </div>
          )}
        </Card>

        {expenseError && (
          <p className="text-sm text-negative text-center px-2">
            {expenseError}
          </p>
        )}

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
            disabled={saving || !synced}
          >
            {saving || !synced ? t.common.loading : t.close.calculateResults}
          </Button>
          {/* A way out that is not "calculate results". This screen is where
              a reopened table lands, and the only exit used to be the header
              chevron, whose router.back() goes wherever the history happens
              to point after two router.replace calls. Leaving had to mean
              re-closing the game, which is how tables ended up closed but
              never saved. This goes to the table itself, which is a fixed
              destination and leaves the game exactly as it is. */}
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            disabled={saving}
            onClick={() => router.push(`/groups/${groupId}/games/${gameId}`)}
          >
            {t.close.backToGame}
          </Button>
        </div>
      </main>

      <ExpenseListSheet
        open={showExpenseList}
        onClose={() => setShowExpenseList(false)}
        expenses={expenses}
        participants={expenseParticipants}
        players={players}
        currency={game.currency}
        onSelect={(expenseId) => {
          setShowExpenseList(false)
          setExpenseError('')
          setEditingExpenseId(expenseId)
        }}
      />

      <ExpenseSheet
        open={editingExpense !== null}
        onClose={() => setEditingExpenseId(null)}
        players={players}
        currency={game.currency}
        editing={editingExpense}
        onSubmit={() => {}}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />
    </>
  )
}
