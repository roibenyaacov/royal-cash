'use client'

import {
  useState,
  useCallback,
  useMemo,
  useOptimistic,
  useTransition,
} from 'react'
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
  ExpenseSplitType,
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

// ---------------------------------------------------------------------------
// Optimistic state + reducer
//
// Every game-mutating handler dispatches an OptimisticAction inside a
// React transition. The reducer applies the action against the latest
// authoritative serverState; the displayed `optimisticState` is the
// composition of all pending updates. When the transition ends, that
// update is removed from the pending queue and only the real serverState
// remains.
// ---------------------------------------------------------------------------

type ServerState = {
  players: Player[]
  allGroupPlayers: Player[]
  buyIns: BuyIn[]
  expenses: Expense[]
  expenseParticipants: ExpenseParticipant[]
  events: GameEvent[]
}

type OptimisticAction =
  | { type: 'add_buy_ins'; buyIns: BuyIn[]; events: GameEvent[] }
  | {
      type: 'remove_buy_in'
      buyInId: string
      removeEvent: GameEvent
      alsoRemovePlayerId?: string
      playerRemovedEvent?: GameEvent
    }
  | {
      type: 'add_existing_player'
      player: Player
      buyIn: BuyIn | null
      event: GameEvent | null
    }
  | {
      type: 'add_new_player'
      player: Player
      addToGroupRoster: boolean
      buyIn: BuyIn | null
      event: GameEvent | null
    }
  | {
      type: 'add_expense'
      expense: Expense
      participants: ExpenseParticipant[]
      event: GameEvent
    }

function optimisticReducer(
  state: ServerState,
  action: OptimisticAction,
): ServerState {
  switch (action.type) {
    case 'add_buy_ins':
      return {
        ...state,
        buyIns: [...state.buyIns, ...action.buyIns],
        events: [...action.events, ...state.events],
      }
    case 'remove_buy_in': {
      const newBuyIns = state.buyIns.filter((b) => b.id !== action.buyInId)
      const eventsAfterRemove = [action.removeEvent, ...state.events]
      const events = action.playerRemovedEvent
        ? [action.playerRemovedEvent, ...eventsAfterRemove]
        : eventsAfterRemove
      const players = action.alsoRemovePlayerId
        ? state.players.filter((p) => p.id !== action.alsoRemovePlayerId)
        : state.players
      return { ...state, buyIns: newBuyIns, events, players }
    }
    case 'add_existing_player': {
      const alreadyHas = state.players.some((p) => p.id === action.player.id)
      return {
        ...state,
        players: alreadyHas ? state.players : [...state.players, action.player],
        buyIns: action.buyIn ? [...state.buyIns, action.buyIn] : state.buyIns,
        events: action.event ? [action.event, ...state.events] : state.events,
      }
    }
    case 'add_new_player':
      return {
        ...state,
        players: [...state.players, action.player],
        allGroupPlayers: action.addToGroupRoster
          ? [...state.allGroupPlayers, action.player]
          : state.allGroupPlayers,
        buyIns: action.buyIn ? [...state.buyIns, action.buyIn] : state.buyIns,
        events: action.event ? [action.event, ...state.events] : state.events,
      }
    case 'add_expense':
      return {
        ...state,
        expenses: [...state.expenses, action.expense],
        expenseParticipants: [
          ...state.expenseParticipants,
          ...action.participants,
        ],
        events: [action.event, ...state.events],
      }
  }
}

// ---------------------------------------------------------------------------

const pendingId = () => `pending:${crypto.randomUUID()}`

// Realtime can refetch + replace serverState in between an action firing
// and the action's response landing. These helpers make sure we don't
// duplicate a row that the refetch already wrote.
function appendUnique<T extends { id: string }>(arr: T[], item: T): T[] {
  return arr.some((x) => x.id === item.id) ? arr : [...arr, item]
}

function prependUnique<T extends { id: string }>(arr: T[], item: T): T[] {
  return arr.some((x) => x.id === item.id) ? arr : [item, ...arr]
}

function getBuyInErrorMessage(err: unknown): string | null {
  if (
    err instanceof Error &&
    err.message === 'cannot_remove_player_with_expenses'
  ) {
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
  const [serverState, setServerState] = useState<ServerState>({
    players: initialPlayers,
    allGroupPlayers: initialAllGroupPlayers,
    buyIns: initialBuyIns,
    expenses: initialExpenses,
    expenseParticipants: initialExpenseParticipants,
    events: initialEvents,
  })
  const [optimisticState, applyOptimistic] = useOptimistic(
    serverState,
    optimisticReducer,
  )
  const [, startTransition] = useTransition()

  const [showExpense, setShowExpense] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showDeleteGame, setShowDeleteGame] = useState(false)
  const [deletingGame, setDeletingGame] = useState(false)
  const [buyInError, setBuyInError] = useState('')

  const { players, allGroupPlayers, buyIns, expenses, events } = optimisticState

  // Realtime + slow polling refreshes the authoritative serverState.
  const fetchData = useCallback(async () => {
    const supabase = createClient()
    try {
      const [
        gameData,
        rosterPlayers,
        allPlayers,
        buyInsData,
        { expenses: expensesData, participants },
        eventsData,
      ] = await Promise.all([
        getGame(supabase, gameId),
        getGameRosterPlayers(supabase, gameId),
        getGroupPlayers(supabase, groupId),
        getGameBuyIns(supabase, gameId),
        getGameExpensesWithParticipants(supabase, gameId),
        getGameEvents(supabase, gameId).catch(() => [] as GameEvent[]),
      ])

      if (gameData) setGame(gameData)
      setServerState({
        players: rosterPlayers,
        allGroupPlayers: allPlayers,
        buyIns: buyInsData,
        expenses: expensesData,
        expenseParticipants: participants,
        events: eventsData,
      })
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
    () => players.filter((p) => calcPlayerBuyIns(buyIns, p.id) === 0),
    [players, buyIns],
  )

  // --- Handlers (optimistic) ------------------------------------------------

  const handleAddDefaultBuyIn = (playerId: string) => {
    setBuyInError('')
    const nowIso = new Date().toISOString()
    const optimisticBuyIn: BuyIn = {
      id: pendingId(),
      game_id: gameId,
      player_id: playerId,
      amount: game.default_buy_in,
      created_by: '',
      created_at: nowIso,
      note: null,
    }
    const optimisticEvent: GameEvent = {
      id: pendingId(),
      game_id: gameId,
      event_type: 'buy_in_added',
      player_id: playerId,
      amount: game.default_buy_in,
      description: null,
      created_by: '',
      created_at: nowIso,
    }

    startTransition(async () => {
      applyOptimistic({
        type: 'add_buy_ins',
        buyIns: [optimisticBuyIn],
        events: [optimisticEvent],
      })
      try {
        const { buyIn, event } = await addDefaultBuyInAction(
          gameId,
          playerId,
          game.default_buy_in,
        )
        setServerState((prev) => ({
          ...prev,
          buyIns: appendUnique(prev.buyIns, buyIn),
          events: prependUnique(prev.events, event),
        }))
      } catch (err) {
        const msg = getBuyInErrorMessage(err)
        if (msg) setBuyInError(msg)
        else console.error('Failed to add buy-in:', err)
        void fetchData()
      }
    })
  }

  const handleRemoveDefaultBuyIn = (playerId: string) => {
    setBuyInError('')

    const matching = optimisticState.buyIns
      .filter(
        (b) => b.player_id === playerId && b.amount === game.default_buy_in,
      )
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const targetBuyIn = matching[0]
    if (!targetBuyIn) return

    const remainingForPlayer = optimisticState.buyIns.filter(
      (b) => b.player_id === playerId && b.id !== targetBuyIn.id,
    )
    const willDropPlayer = remainingForPlayer.length === 0

    const nowIso = new Date().toISOString()
    const optimisticRemoveEvent: GameEvent = {
      id: pendingId(),
      game_id: gameId,
      event_type: 'buy_in_removed',
      player_id: playerId,
      amount: game.default_buy_in,
      description: null,
      created_by: '',
      created_at: nowIso,
    }
    const optimisticPlayerRemovedEvent: GameEvent | undefined = willDropPlayer
      ? {
          id: pendingId(),
          game_id: gameId,
          event_type: 'buy_in_removed',
          player_id: playerId,
          amount: null,
          description: 'הוסר מהשולחן',
          created_by: '',
          created_at: nowIso,
        }
      : undefined

    startTransition(async () => {
      applyOptimistic({
        type: 'remove_buy_in',
        buyInId: targetBuyIn.id,
        removeEvent: optimisticRemoveEvent,
        alsoRemovePlayerId: willDropPlayer ? playerId : undefined,
        playerRemovedEvent: optimisticPlayerRemovedEvent,
      })

      try {
        const result = await removeDefaultBuyInAction(
          gameId,
          playerId,
          game.default_buy_in,
        )
        if (!result) return
        setServerState((prev) => {
          const eventsAfterRemove = prependUnique(prev.events, result.removeEvent)
          const events = result.playerRemoved
            ? prependUnique(eventsAfterRemove, result.playerRemoved.event)
            : eventsAfterRemove
          return {
            ...prev,
            buyIns: prev.buyIns.filter((b) => b.id !== result.removedBuyIn.id),
            events,
            players: result.playerRemoved
              ? prev.players.filter((p) => p.id !== playerId)
              : prev.players,
          }
        })
      } catch (err) {
        const msg = getBuyInErrorMessage(err)
        if (msg) setBuyInError(msg)
        else console.error('Failed to remove buy-in:', err)
        void fetchData()
      }
    })
  }

  // The count-input is rare and the server fires N internal ops, so we
  // optimistically apply the diff and then refetch once for canonical IDs.
  const handleSetBuyInCount = (playerId: string, count: number) => {
    setBuyInError('')

    const matchingBuyIns = optimisticState.buyIns.filter(
      (b) => b.player_id === playerId && b.amount === game.default_buy_in,
    )
    const currentCount = matchingBuyIns.length
    const diff = count - currentCount
    if (diff === 0) return

    const nowIso = new Date().toISOString()

    startTransition(async () => {
      if (diff > 0) {
        const newBuyIns: BuyIn[] = []
        const newEvents: GameEvent[] = []
        for (let i = 0; i < diff; i++) {
          newBuyIns.push({
            id: pendingId(),
            game_id: gameId,
            player_id: playerId,
            amount: game.default_buy_in,
            created_by: '',
            created_at: nowIso,
            note: null,
          })
          newEvents.push({
            id: pendingId(),
            game_id: gameId,
            event_type: 'buy_in_added',
            player_id: playerId,
            amount: game.default_buy_in,
            description: null,
            created_by: '',
            created_at: nowIso,
          })
        }
        applyOptimistic({
          type: 'add_buy_ins',
          buyIns: newBuyIns,
          events: newEvents,
        })
      } else {
        const sorted = matchingBuyIns
          .slice()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
        for (let i = 0; i < Math.abs(diff); i++) {
          const target = sorted[i]
          if (!target) break
          const willDrop = count === 0 && i === sorted.length - 1
          applyOptimistic({
            type: 'remove_buy_in',
            buyInId: target.id,
            removeEvent: {
              id: pendingId(),
              game_id: gameId,
              event_type: 'buy_in_removed',
              player_id: playerId,
              amount: game.default_buy_in,
              description: null,
              created_by: '',
              created_at: nowIso,
            },
            alsoRemovePlayerId: willDrop ? playerId : undefined,
            playerRemovedEvent: willDrop
              ? {
                  id: pendingId(),
                  game_id: gameId,
                  event_type: 'buy_in_removed',
                  player_id: playerId,
                  amount: null,
                  description: 'הוסר מהשולחן',
                  created_by: '',
                  created_at: nowIso,
                }
              : undefined,
          })
        }
      }

      try {
        await setPlayerBuyInCountAction(
          gameId,
          playerId,
          count,
          game.default_buy_in,
        )
        // The action does N internal inserts/deletes — refetch to learn the
        // real IDs and reconcile any drift.
        await fetchData()
      } catch (err) {
        const msg = getBuyInErrorMessage(err)
        if (msg) setBuyInError(msg)
        else console.error('Failed to set buy-in count:', err)
        // The optimistic state will discard at transition end; refetch
        // to make sure displayed state matches reality after the error.
        void fetchData()
      }
    })
  }

  const handleAddExpense = (
    paidByPlayerId: string,
    amount: number,
    description: string,
    splitType: ExpenseSplitType,
    participants: { playerId: string; amountOwed: number }[],
  ) => {
    const nowIso = new Date().toISOString()
    const tempExpenseId = pendingId()
    const optimisticExpense: Expense = {
      id: tempExpenseId,
      game_id: gameId,
      paid_by_player_id: paidByPlayerId,
      amount,
      description,
      split_type: splitType,
      created_by: '',
      created_at: nowIso,
    }
    const optimisticParticipants: ExpenseParticipant[] = participants.map(
      (p) => ({
        id: pendingId(),
        expense_id: tempExpenseId,
        player_id: p.playerId,
        amount_owed: p.amountOwed,
      }),
    )
    const optimisticEvent: GameEvent = {
      id: pendingId(),
      game_id: gameId,
      event_type: 'expense_added',
      player_id: paidByPlayerId,
      amount,
      description: description.trim() || null,
      created_by: '',
      created_at: nowIso,
    }

    startTransition(async () => {
      applyOptimistic({
        type: 'add_expense',
        expense: optimisticExpense,
        participants: optimisticParticipants,
        event: optimisticEvent,
      })

      try {
        const result = await addExpenseAction(
          gameId,
          paidByPlayerId,
          amount,
          description,
          splitType,
          participants,
        )
        setServerState((prev) => {
          const participantIds = new Set(
            prev.expenseParticipants.map((p) => p.id),
          )
          const newParticipants = result.participants.filter(
            (p) => !participantIds.has(p.id),
          )
          return {
            ...prev,
            expenses: appendUnique(prev.expenses, result.expense),
            expenseParticipants: [
              ...prev.expenseParticipants,
              ...newParticipants,
            ],
            events: prependUnique(prev.events, result.event),
          }
        })
      } catch (err) {
        console.error('Failed to add expense:', err)
        void fetchData()
      }
    })
  }

  const handleAddExistingPlayer = (playerId: string, withBuyIn: boolean) => {
    setShowAddPlayer(false)

    const player = optimisticState.allGroupPlayers.find(
      (p) => p.id === playerId,
    )
    if (!player) return

    const nowIso = new Date().toISOString()
    const buyInAmount = withBuyIn ? game.default_buy_in : 0

    const optimisticBuyIn: BuyIn | null =
      buyInAmount > 0
        ? {
            id: pendingId(),
            game_id: gameId,
            player_id: playerId,
            amount: buyInAmount,
            created_by: '',
            created_at: nowIso,
            note: null,
          }
        : null

    const optimisticEvent: GameEvent | null =
      buyInAmount > 0
        ? {
            id: pendingId(),
            game_id: gameId,
            event_type: 'buy_in_added',
            player_id: playerId,
            amount: buyInAmount,
            description: 'הצטרפות למשחק',
            created_by: '',
            created_at: nowIso,
          }
        : null

    startTransition(async () => {
      applyOptimistic({
        type: 'add_existing_player',
        player,
        buyIn: optimisticBuyIn,
        event: optimisticEvent,
      })

      try {
        const result = await addPlayerToGameAction(
          gameId,
          playerId,
          buyInAmount,
        )
        setServerState((prev) => ({
          ...prev,
          players: appendUnique(prev.players, player),
          buyIns: result.buyIn
            ? appendUnique(prev.buyIns, result.buyIn)
            : prev.buyIns,
          events: result.event
            ? prependUnique(prev.events, result.event)
            : prev.events,
        }))
      } catch (err) {
        console.error('Failed to add player:', err)
        void fetchData()
      }
    })
  }

  // "Re-add first buy-in to an at-zero player" reuses the +/+default flow.
  const handleAddBuyInToPlayer = (playerId: string) => {
    setShowAddPlayer(false)
    handleAddDefaultBuyIn(playerId)
  }

  const handleAddNewPlayer = (
    name: string,
    addToGroup: boolean,
    withBuyIn: boolean,
  ) => {
    setShowAddPlayer(false)

    const trimmedName = name.trim()
    if (!trimmedName) return

    const nowIso = new Date().toISOString()
    const tempPlayerId = pendingId()

    const optimisticPlayer: Player = {
      id: tempPlayerId,
      group_id: groupId,
      display_name: trimmedName,
      phone: null,
      linked_user_id: null,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const buyInAmount = withBuyIn ? game.default_buy_in : 0
    const optimisticBuyIn: BuyIn | null =
      buyInAmount > 0
        ? {
            id: pendingId(),
            game_id: gameId,
            player_id: tempPlayerId,
            amount: buyInAmount,
            created_by: '',
            created_at: nowIso,
            note: null,
          }
        : null

    const optimisticEvent: GameEvent | null =
      buyInAmount > 0
        ? {
            id: pendingId(),
            game_id: gameId,
            event_type: 'buy_in_added',
            player_id: tempPlayerId,
            amount: buyInAmount,
            description: 'הצטרפות למשחק',
            created_by: '',
            created_at: nowIso,
          }
        : null

    startTransition(async () => {
      applyOptimistic({
        type: 'add_new_player',
        player: optimisticPlayer,
        addToGroupRoster: addToGroup,
        buyIn: optimisticBuyIn,
        event: optimisticEvent,
      })

      try {
        const result = await addNewPlayerToGameAction(groupId, gameId, trimmedName, {
          addToGroup,
          initialBuyIn: buyInAmount,
        })
        setServerState((prev) => ({
          ...prev,
          players: [...prev.players, result.player],
          allGroupPlayers: addToGroup
            ? [...prev.allGroupPlayers, result.player]
            : prev.allGroupPlayers,
          buyIns: result.buyIn ? [...prev.buyIns, result.buyIn] : prev.buyIns,
          events: result.event ? [result.event, ...prev.events] : prev.events,
        }))
      } catch (err) {
        console.error('Failed to add new player:', err)
      }
    })
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
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push(`/groups/${groupId}/games/${gameId}/close`)}
          >
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
        addingPlayerId={null}
        savingNew={false}
        onAddExisting={async (playerId, withBuyIn) => {
          handleAddExistingPlayer(playerId, withBuyIn)
        }}
        onAddBuyInToPlayer={async (playerId) => {
          handleAddBuyInToPlayer(playerId)
        }}
        onAddNew={async (name, addToGroup, withBuyIn) => {
          handleAddNewPlayer(name, addToGroup, withBuyIn)
        }}
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
