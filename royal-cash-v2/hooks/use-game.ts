'use client'

import { useState, useCallback, useMemo } from 'react'
import type {
  Game,
  Player,
  GamePlayer,
  BuyIn,
  Expense,
  ExpenseParticipant,
  CashOut,
  GameResult,
} from '@/lib/domain/types'
import { calcAllPlayerBalances } from '@/lib/calculations/balance'
import { calcSettlements, type SettlementTransfer } from '@/lib/calculations/settlement'
import { validateGameForClose, type ValidationResult } from '@/lib/calculations/validation'

export type GameState = {
  game: Game
  players: Player[]
  gamePlayers: GamePlayer[]
  buyIns: BuyIn[]
  expenses: Expense[]
  expenseParticipants: ExpenseParticipant[]
  cashOuts: CashOut[]
}

export function useGame(initialGame: Game, groupPlayers: Player[]) {
  const [game, setGame] = useState<Game>(initialGame)
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([])
  const [buyIns, setBuyIns] = useState<BuyIn[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseParticipants, setExpenseParticipants] = useState<ExpenseParticipant[]>([])
  const [cashOuts, setCashOuts] = useState<CashOut[]>([])

  const activePlayerIds = useMemo(
    () => gamePlayers.map((gp) => gp.player_id),
    [gamePlayers],
  )

  const activePlayers = useMemo(
    () => groupPlayers.filter((p) => activePlayerIds.includes(p.id)),
    [groupPlayers, activePlayerIds],
  )

  const participantsByExpense = useMemo(() => {
    const map = new Map<string, ExpenseParticipant[]>()
    for (const ep of expenseParticipants) {
      const list = map.get(ep.expense_id) ?? []
      list.push(ep)
      map.set(ep.expense_id, list)
    }
    return map
  }, [expenseParticipants])

  const totalBuyIns = useMemo(
    () => buyIns.reduce((s, b) => s + b.amount, 0),
    [buyIns],
  )

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

  const addGamePlayer = useCallback(
    (playerId: string) => {
      if (gamePlayers.some((gp) => gp.player_id === playerId)) return
      setGamePlayers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          game_id: game.id,
          player_id: playerId,
          is_manager: false,
          joined_at: new Date().toISOString(),
        },
      ])
    },
    [game.id, gamePlayers],
  )

  const removeGamePlayer = useCallback((playerId: string) => {
    setGamePlayers((prev) => prev.filter((gp) => gp.player_id !== playerId))
  }, [])

  const addBuyIn = useCallback(
    (playerId: string, amount: number, note?: string) => {
      setBuyIns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          game_id: game.id,
          player_id: playerId,
          amount,
          created_by: 'current-user',
          created_at: new Date().toISOString(),
          note: note ?? null,
        },
      ])
    },
    [game.id],
  )

  const addExpense = useCallback(
    (
      paidByPlayerId: string,
      amount: number,
      description: string,
      splitType: Expense['split_type'],
      participants: { playerId: string; amountOwed: number }[],
    ) => {
      const expenseId = crypto.randomUUID()
      setExpenses((prev) => [
        ...prev,
        {
          id: expenseId,
          game_id: game.id,
          paid_by_player_id: paidByPlayerId,
          amount,
          description,
          split_type: splitType,
          created_by: 'current-user',
          created_at: new Date().toISOString(),
        },
      ])
      setExpenseParticipants((prev) => [
        ...prev,
        ...participants.map((p) => ({
          id: crypto.randomUUID(),
          expense_id: expenseId,
          player_id: p.playerId,
          amount_owed: p.amountOwed,
        })),
      ])
    },
    [game.id],
  )

  const setCashOut = useCallback(
    (playerId: string, amount: number) => {
      setCashOuts((prev) => {
        const existing = prev.findIndex((c) => c.player_id === playerId)
        const entry: CashOut = {
          id: existing >= 0 ? prev[existing].id : crypto.randomUUID(),
          game_id: game.id,
          player_id: playerId,
          amount,
          created_by: 'current-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = entry
          return next
        }
        return [...prev, entry]
      })
    },
    [game.id],
  )

  const validate = useCallback((): ValidationResult => {
    return validateGameForClose(
      activePlayerIds,
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
    )
  }, [activePlayerIds, buyIns, cashOuts, expenses, participantsByExpense])

  const calculateResults = useCallback((): {
    results: Omit<GameResult, 'id' | 'created_at'>[]
    settlements: SettlementTransfer[]
  } => {
    const results = calcAllPlayerBalances(
      activePlayerIds,
      buyIns,
      cashOuts,
      expenses,
      participantsByExpense,
      game.id,
    )
    const balances = results.map((r) => ({
      playerId: r.player_id,
      amount: r.final_balance,
    }))
    const settlements = calcSettlements(balances)
    return { results, settlements }
  }, [activePlayerIds, buyIns, cashOuts, expenses, participantsByExpense, game.id])

  const closeGame = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      status: 'closed' as const,
      closed_at: new Date().toISOString(),
    }))
  }, [])

  return {
    game,
    gamePlayers,
    activePlayers,
    buyIns,
    expenses,
    expenseParticipants,
    cashOuts,
    totalBuyIns,
    totalExpenses,
    participantsByExpense,
    addGamePlayer,
    removeGamePlayer,
    addBuyIn,
    addExpense,
    setCashOut,
    validate,
    calculateResults,
    closeGame,
  }
}
