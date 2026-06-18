'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlayerCard } from '@/components/games/player-card'
import { AddPlayerToGameSheet } from '@/components/games/add-player-to-game-sheet'
import { ExpenseSheet } from '@/components/expenses/expense-sheet'
import { GameActivityLog } from '@/components/games/game-activity-log'
import { createClient } from '@/lib/supabase/client'
import { getGame, getGameRosterPlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import { getGameEvents } from '@/lib/db/game-events'
import { useGameRealtime } from '@/hooks/use-game-realtime'
import { calcPlayerBuyIns } from '@/lib/calculations/buy-ins'
import {
  addDefaultBuyInAction,
  removeDefaultBuyInAction,
  setPlayerBuyInCountAction,
  addExpenseAction,
  addPlayerToGameAction,
  addNewPlayerToGameAction,
  deleteGameAction,
} from '@/app/actions/games'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import type {
  Game,
  Player,
  BuyIn,
  Expense,
  ExpenseParticipant,
  GameEvent,
} from '@/lib/domain/types'

interface ActiveGameClientProps {
  groupId: string
  gameId: string
  initialGame: Game
  initialPlayers: Player[]
  initialAllGroupPlayers: Player[]
  initialBuyIns: BuyIn[]
  initialExpenses: Expense[]
  initialExpenseParticipants: ExpenseParticipant[]
  initialEvents: GameEvent[]
}

function getBuyInErrorMessage(err: unknown): string | null {
  if (err instanceof Error && err.message === 'cannot_remove_player_with_expenses') {
    return t.players.cannotRemoveWithExpenses
  }
  return null
}

export default function ActiveGameClient({
  groupId,
  gameId,
  initialGame,
  initialPlayers,
  initialAllGroupPlayers,
  initialBuyIns,
  initialExpenses,
  initialExpenseParticipants,
  initialEvents,
}: ActiveGameClientProps) {
  const router = useRouter()
  const [game, setGame] = useState<Game>(initialGame)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [allGroupPlayers, setAllGroupPlayers] = useState<Player[]>(initialAllGroupPlayers)
  const [buyIns, setBuyIns] = useState<BuyIn[]>(initialBuyIns)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [, setExpenseParticipants] = useState<ExpenseParticipant[]>(initialExpenseParticipants)
  const [events, setEvents] = useState<GameEvent[]>(initialEvents)
  const [showExpense, setShowExpense] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showDeleteGame, setShowDeleteGame] = useState(false)
  const [deletingGame, setDeletingGame] = useState(false)
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null)
  const [savingNewPlayer, setSavingNewPlayer] = useState(false)
  const [buyInError, setBuyInError] = useState('')

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    try {
      const [gameData, rosterPlayers, allPlayers, buyInsData, { expenses: expensesData, participants }, eventsData] =
        await Promise.all([
          getGame(supabase, gameId),
          getGameRosterPlayers(supabase, gameId),
          getGroupPlayers(supabase, groupId),
          getGameBuyIns(supabase, gameId),
          getGameExpensesWithParticipants(supabase, gameId),
          getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
        ])

      if (gameData) setGame(gameData)
      setPlayers(rosterPlayers)
      setBuyIns(buyInsData)
      setExpenses(expensesData)
      setExpenseParticipants(participants)
      setAllGroupPlayers(allPlayers)
      setEvents(eventsData)
    } catch (err) {
      console.error('Failed to refresh game:', err)
    }
  }, [gameId, groupId])

  useGameRealtime(gameId, fetchData)

  const visiblePlayers = useMemo(
    () => players.filter((p) => calcPlayerBuyIns(buyIns, p.id) > 0),
    [players, buyIns],
  )

  const playerNames = useMemo(
    () => new Map(visiblePlayers.map((p) => [p.id, p.display_name])),
    [visiblePlayers],
  )

  const playersNotInGame = useMemo(() => {
    const inGameIds = new Set(players.map((p) => p.id))
    return allGroupPlayers.filter((p) => !inGameIds.has(p.id))
  }, [players, allGroupPlayers])

  const playersAtZeroBuyIn = useMemo(
    () =>
      players.filter((p) => calcPlayerBuyIns(buyIns, p.id) === 0),
    [players, buyIns],
  )

  const handleAddDefaultBuyIn = async (playerId: string) => {
    setBuyInError('')
    try {
      await addDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await fetchData()
    } catch (err) {
      const msg = getBuyInErrorMessage(err)
      if (msg) setBuyInError(msg)
      else console.error('Failed to add buy-in:', err)
    }
  }

  const handleRemoveDefaultBuyIn = async (playerId: string) => {
    setBuyInError('')
    try {
      await removeDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await fetchData()
    } catch (err) {
      const msg = getBuyInErrorMessage(err)
      if (msg) setBuyInError(msg)
      else console.error('Failed to remove buy-in:', err)
    }
  }

  const handleSetBuyInCount = async (playerId: string, count: number) => {
    setBuyInError('')
    try {
      await setPlayerBuyInCountAction(gameId, playerId, count, game.default_buy_in)
      await fetchData()
    } catch (err) {
      const msg = getBuyInErrorMessage(err)
      if (msg) setBuyInError(msg)
      else console.error('Failed to set buy-in count:', err)
    }
  }

  const handleAddExpense = async (
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: Expense['split_type'],
    participants: { playerId: string; amountOwed: number }[],
  ) => {
    try {
      await addExpenseAction(gameId, paidByPlayerId, amount, description, splitType, participants)
      await fetchData()
    } catch (err) {
      console.error('Failed to add expense:', err)
    }
  }

  const handleAddBuyInToPlayer = async (playerId: string) => {
    if (addingPlayer) return
    setAddingPlayer(playerId)
    try {
      await addDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await fetchData()
    } catch (err) {
      console.error('Failed to add buy-in:', err)
    } finally {
      setAddingPlayer(null)
    }
  }

  const handleAddExistingPlayer = async (playerId: string, withBuyIn: boolean) => {
    if (addingPlayer) return
    setAddingPlayer(playerId)
    try {
      await addPlayerToGameAction(
        gameId,
        playerId,
        withBuyIn ? game.default_buy_in : 0,
      )
      await fetchData()
      setShowAddPlayer(false)
    } catch (err) {
      console.error('Failed to add player:', err)
    } finally {
      setAddingPlayer(null)
    }
  }

  const handleAddNewPlayer = async (
    name: string,
    addToGroup: boolean,
    withBuyIn: boolean,
  ) => {
    if (savingNewPlayer) return
    setSavingNewPlayer(true)
    try {
      await addNewPlayerToGameAction(groupId, gameId, name, {
        addToGroup,
        initialBuyIn: withBuyIn ? game.default_buy_in : 0,
      })
      await fetchData()
      setShowAddPlayer(false)
    } catch (err) {
      console.error('Failed to add new player:', err)
    } finally {
      setSavingNewPlayer(false)
    }
  }

  const handleDeleteGame = async () => {
    if (deletingGame) return
    setDeletingGame(true)
    try {
      await deleteGameAction(groupId, gameId)
      router.push(`/groups/${groupId}`)
    } catch (err) {
      console.error('Failed to delete game:', err)
      throw err
    } finally {
      setDeletingGame(false)
    }
  }

  const symbol = t.currency[game.currency]
  const totalBuyIns = buyIns.reduce((s, b) => s + b.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <>
      <PageHeader title={game.name} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label={t.game.totalBuyIns} value={`${symbol}${totalBuyIns}`} />
          <SummaryCard label={t.game.playersCount} value={String(visiblePlayers.length)} />
          <SummaryCard label={t.game.expensesTotal} value={`${symbol}${totalExpenses}`} />
        </div>

        {buyInError && (
          <p className="text-sm text-negative text-center px-2">{buyInError}</p>
        )}

        <div className="flex flex-col gap-1.5">
          {visiblePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              name={player.display_name}
              buyIns={buyIns.filter((b) => b.player_id === player.id)}
              defaultBuyIn={game.default_buy_in}
              currency={game.currency}
              onAddDefault={() => handleAddDefaultBuyIn(player.id)}
              onRemoveDefault={() => handleRemoveDefaultBuyIn(player.id)}
              onSetCount={(count) => handleSetBuyInCount(player.id, count)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddPlayer(true)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-text-muted text-sm active:bg-surface-elevated transition-colors min-h-[44px]"
        >
          <span className="text-lg leading-none">+</span>
          {t.players.addToGame}
        </button>

        <GameActivityLog
          events={events}
          playerNames={playerNames}
          currency={game.currency}
        />

        <div className="flex flex-col gap-3 mt-auto pt-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => setShowExpense(true)}
          >
            {t.expenses.title}
          </Button>
          <Button fullWidth size="lg" onClick={() => router.push(`/groups/${groupId}/games/${gameId}/close`)}>
            {t.game.closeGame}
          </Button>
          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={() => setShowDeleteGame(true)}
          >
            {t.game.deleteGame}
          </Button>
        </div>
      </main>

      <ConfirmSheet
        open={showDeleteGame}
        onClose={() => setShowDeleteGame(false)}
        title={t.game.deleteGameTitle}
        message={t.game.deleteGameWarning}
        confirmLabel={t.game.deleteGameConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={handleDeleteGame}
      />

      <ExpenseSheet
        open={showExpense}
        onClose={() => setShowExpense(false)}
        players={visiblePlayers}
        currency={game.currency}
        onSubmit={handleAddExpense}
      />

      <AddPlayerToGameSheet
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        gameId={gameId}
        gameName={game.name}
        defaultBuyIn={game.default_buy_in}
        currency={game.currency}
        playersNotInGame={playersNotInGame}
        playersAtZeroBuyIn={playersAtZeroBuyIn}
        addingPlayerId={addingPlayer}
        savingNew={savingNewPlayer}
        onAddExisting={handleAddExistingPlayer}
        onAddBuyInToPlayer={handleAddBuyInToPlayer}
        onAddNew={handleAddNewPlayer}
      />
    </>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text-primary" dir="ltr">
        {value}
      </p>
    </Card>
  )
}
