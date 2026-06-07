'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PlayerCard } from '@/components/games/player-card'
import { ExpenseSheet } from '@/components/expenses/expense-sheet'
import { GameActivityLog } from '@/components/games/game-activity-log'
import { Loading } from '@/components/ui/loading'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { createClient } from '@/lib/supabase/client'
import { getGame, getGamePlayers } from '@/lib/db/games'
import { getGroupPlayers } from '@/lib/db/players'
import { getGameBuyIns } from '@/lib/db/buy-ins'
import { getGameExpenses, getExpenseParticipants } from '@/lib/db/expenses'
import { getGameEvents } from '@/lib/db/game-events'
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

export default function ActiveGamePage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>
}) {
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [gameId, setGameId] = useState('')
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [allGroupPlayers, setAllGroupPlayers] = useState<Player[]>([])
  const [buyIns, setBuyIns] = useState<BuyIn[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseParticipants, setExpenseParticipants] = useState<ExpenseParticipant[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpense, setShowExpense] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null)

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
      setAllGroupPlayers(allPlayers)

      const gamePlayerIds = new Set(gamePlayersData.map((gp) => gp.player_id))
      setPlayers(allPlayers.filter((p) => gamePlayerIds.has(p.id)))

      if (expensesData.length > 0) {
        const epData = await getExpenseParticipants(
          supabase,
          expensesData.map((e) => e.id),
        )
        setExpenseParticipants(epData)
      }

      try {
        const eventsData = await getGameEvents(supabase, gameId)
        setEvents(eventsData)
      } catch {
        setEvents([])
      }
    } catch (err) {
      console.error('Failed to load game:', err)
    } finally {
      setLoading(false)
    }
  }, [gameId, groupId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refreshAfterMutation = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  // Players in the group but not yet in this game
  const playersNotInGame = useMemo(() => {
    const inGameIds = new Set(players.map((p) => p.id))
    return allGroupPlayers.filter((p) => !inGameIds.has(p.id))
  }, [players, allGroupPlayers])

  const handleAddDefaultBuyIn = async (playerId: string) => {
    if (!game) return
    try {
      await addDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await refreshAfterMutation()
    } catch (err) {
      console.error('Failed to add buy-in:', err)
    }
  }

  const handleRemoveDefaultBuyIn = async (playerId: string) => {
    if (!game) return
    try {
      await removeDefaultBuyInAction(gameId, playerId, game.default_buy_in)
      await refreshAfterMutation()
    } catch (err) {
      console.error('Failed to remove buy-in:', err)
    }
  }

  const handleSetBuyInCount = async (playerId: string, count: number) => {
    if (!game) return
    try {
      await setPlayerBuyInCountAction(gameId, playerId, count, game.default_buy_in)
      await refreshAfterMutation()
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
    if (!gameId) return
    try {
      await addExpenseAction(gameId, paidByPlayerId, amount, description, splitType, participants)
      await refreshAfterMutation()
    } catch (err) {
      console.error('Failed to add expense:', err)
    }
  }

  const handleAddPlayerToGame = async (playerId: string) => {
    if (!game || addingPlayer) return
    setAddingPlayer(playerId)
    try {
      await addPlayerToGameAction(gameId, playerId, game.default_buy_in)
      await refreshAfterMutation()
      setShowAddPlayer(false)
    } catch (err) {
      console.error('Failed to add player:', err)
    } finally {
      setAddingPlayer(null)
    }
  }

  const handleClose = () => {
    router.push(`/groups/${groupId}/games/${gameId}/close`)
  }

  if (loading || !game) {
    return (
      <>
        <PageHeader title={t.common.loading} showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  const symbol = t.currency[game.currency]
  const totalBuyIns = buyIns.reduce((s, b) => s + b.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <>
      <PageHeader title={game.name} showBack />

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label={t.game.totalBuyIns} value={`${symbol}${totalBuyIns}`} />
          <SummaryCard label={t.game.playersCount} value={String(players.length)} />
          <SummaryCard label={t.game.expensesTotal} value={`${symbol}${totalExpenses}`} />
        </div>

        {/* Player cards */}
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

        {/* Add player to game button */}
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

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-auto pt-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => setShowExpense(true)}
          >
            {t.expenses.title}
          </Button>
          <Button fullWidth size="lg" onClick={handleClose}>
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

      {/* Add player mid-game sheet */}
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
