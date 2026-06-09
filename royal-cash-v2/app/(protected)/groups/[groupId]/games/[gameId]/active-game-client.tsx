'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PlayerCard } from '@/components/games/player-card'
import { ExpenseSheet } from '@/components/expenses/expense-sheet'
import { GameActivityLog } from '@/components/games/game-activity-log'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { createClient } from '@/lib/supabase/client'
import { getGame, getGamePlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameExpensesWithParticipants } from '@/lib/db/expenses'
import { getGameEvents } from '@/lib/db/game-events'
import { useGameRealtime } from '@/hooks/use-game-realtime'
import {
  addDefaultBuyInAction,
  removeDefaultBuyInAction,
  setPlayerBuyInCountAction,
  addExpenseAction,
  addPlayerToGameAction,
} from '@/app/actions/games'
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
  const [expenseParticipants, setExpenseParticipants] = useState<ExpenseParticipant[]>(initialExpenseParticipants)
  const [events, setEvents] = useState<GameEvent[]>(initialEvents)
  const [showExpense, setShowExpense] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    try {
      const [gameData, gamePlayersData, allPlayers, buyInsData, { expenses: expensesData, participants }, eventsData] =
        await Promise.all([
          getGame(supabase, gameId),
          getGamePlayers(supabase, gameId),
          getGroupPlayers(supabase, groupId),
          getGameBuyIns(supabase, gameId),
          getGameExpensesWithParticipants(supabase, gameId),
          getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
        ])

      if (gameData) setGame(gameData)
      setBuyIns(buyInsData)
      setExpenses(expensesData)
      setExpenseParticipants(participants)
      setAllGroupPlayers(allPlayers)
      setEvents(eventsData)

      const gamePlayerIds = new Set(gamePlayersData.map((gp) => gp.player_id))
      setPlayers(allPlayers.filter((p) => gamePlayerIds.has(p.id)))
    } catch (err) {
      console.error('Failed to refresh game:', err)
    }
  }, [gameId, groupId])

  useGameRealtime(gameId, fetchData)

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const playersNotInGame = useMemo(() => {
    const inGameIds = new Set(players.map((p) => p.id))
    return allGroupPlayers.filter((p) => !inGameIds.has(p.id))
  }, [players, allGroupPlayers])

  const handleAddDefaultBuyIn = async (playerId: string) => {
    try {
      await addDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await fetchData()
    } catch (err) {
      console.error('Failed to add buy-in:', err)
    }
  }

  const handleRemoveDefaultBuyIn = async (playerId: string) => {
    try {
      await removeDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await fetchData()
    } catch (err) {
      console.error('Failed to remove buy-in:', err)
    }
  }

  const handleSetBuyInCount = async (playerId: string, count: number) => {
    try {
      await setPlayerBuyInCountAction(gameId, playerId, count, game.default_buy_in)
      await fetchData()
    } catch (err) {
      console.error('Failed to set buy-in count:', err)
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

  const handleAddPlayerToGame = async (playerId: string) => {
    if (addingPlayer) return
    setAddingPlayer(playerId)
    try {
      await addPlayerToGameAction(gameId, playerId, game.default_buy_in)
      await fetchData()
      setShowAddPlayer(false)
    } catch (err) {
      console.error('Failed to add player:', err)
    } finally {
      setAddingPlayer(null)
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
          <SummaryCard label={t.game.playersCount} value={String(players.length)} />
          <SummaryCard label={t.game.expensesTotal} value={`${symbol}${totalExpenses}`} />
        </div>

        <div className="flex flex-col gap-1.5">
          {players.map((player) => (
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

        {playersNotInGame.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddPlayer(true)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-text-muted text-sm active:bg-surface-elevated transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            {t.players.addToGame}
          </button>
        )}

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
        </div>
      </main>

      <ExpenseSheet
        open={showExpense}
        onClose={() => setShowExpense(false)}
        players={players}
        currency={game.currency}
        onSubmit={handleAddExpense}
      />

      <BottomSheet
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        title={t.players.addToGameTitle}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-secondary mb-2">
            {t.players.selectToAdd} ({t.players.initialBuyIn.replace('{amount}', `${symbol}${game.default_buy_in}`)})
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
                  onClick={() => handleAddPlayerToGame(player.id)}
                  showChevron={false}
                  trailing={
                    addingPlayer === player.id ? (
                      <span className="text-xs text-text-muted shrink-0">{t.players.addingPlayer}</span>
                    ) : (
                      <span className="text-accent text-[15px] font-medium shrink-0">{t.players.addPlayerShort}</span>
                    )
                  }
                >
                  <span className="font-medium text-text-primary">{player.display_name}</span>
                </IosListRow>
              ))}
            </IosListGroup>
          )}
        </div>
      </BottomSheet>
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
