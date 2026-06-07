'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createGame as dbCreateGame,
  addGamePlayer as dbAddGamePlayer,
  closeGame as dbCloseGame,
  finalizeGame as dbFinalizeGame,
  getGame as dbGetGame,
} from '@/lib/db/games'
import { addBuyIn as dbAddBuyIn, removeLatestBuyIn } from '@/lib/db/buy-ins'
import { addExpense as dbAddExpense } from '@/lib/db/expenses'
import { upsertCashOut as dbUpsertCashOut } from '@/lib/db/cashouts'
import { saveGameResults as dbSaveGameResults, getGameResults } from '@/lib/db/results'
import { applyGameStats } from '@/lib/db/stats'
import { addGameEvent } from '@/lib/db/game-events'
import type {
  Game,
  BuyIn,
  Expense,
  Currency,
  ManagementMode,
  ExpenseSplitType,
  GameResult,
} from '@/lib/domain/types'
import type { SettlementTransfer } from '@/lib/calculations/settlement'

export async function createGameAction(
  groupId: string,
  name: string,
  defaultBuyIn: number,
  currency: Currency,
  playerIds: string[],
): Promise<Game> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const game = await dbCreateGame(supabase, {
    group_id: groupId,
    name,
    date: new Date().toISOString().split('T')[0],
    default_buy_in: defaultBuyIn,
    currency,
    status: 'active',
    management_mode: 'host_only' as ManagementMode,
    created_by: user.id,
  })

  await Promise.all(
    playerIds.map((id) => dbAddGamePlayer(supabase, game.id, id)),
  )

  for (const playerId of playerIds) {
    await dbAddBuyIn(supabase, game.id, playerId, defaultBuyIn, user.id)
    try {
      await addGameEvent(supabase, game.id, 'buy_in_added', user.id, {
        playerId,
        amount: defaultBuyIn,
        description: 'כניסה ראשונית',
      })
    } catch {
      // game_events table may not exist yet
    }
  }

  return game
}

export async function addPlayerToGameAction(
  gameId: string,
  playerId: string,
  buyInAmount: number,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await dbAddGamePlayer(supabase, gameId, playerId)
  await dbAddBuyIn(supabase, gameId, playerId, buyInAmount, user.id)

  try {
    await addGameEvent(supabase, gameId, 'buy_in_added', user.id, {
      playerId,
      amount: buyInAmount,
      description: 'הצטרפות למשחק',
    })
  } catch {}
}

export async function addBuyInAction(
  gameId: string,
  playerId: string,
  amount: number,
  note?: string,
): Promise<BuyIn> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const buyIn = await dbAddBuyIn(supabase, gameId, playerId, amount, user.id, note)

  try {
    await addGameEvent(supabase, gameId, 'buy_in_added', user.id, {
      playerId,
      amount,
      description: note ?? undefined,
    })
  } catch {
    // game_events table may not exist yet
  }

  return buyIn
}

export async function addDefaultBuyInAction(
  gameId: string,
  playerId: string,
  defaultAmount: number,
): Promise<BuyIn> {
  return addBuyInAction(gameId, playerId, defaultAmount)
}

export async function removeDefaultBuyInAction(
  gameId: string,
  playerId: string,
  defaultAmount: number,
): Promise<BuyIn | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const removed = await removeLatestBuyIn(
    supabase,
    gameId,
    playerId,
    defaultAmount,
  )
  if (!removed) return null

  try {
    await addGameEvent(supabase, gameId, 'buy_in_removed', user.id, {
      playerId,
      amount: removed.amount,
    })
  } catch {
    // game_events table may not exist yet
  }

  return removed
}

export async function setPlayerBuyInCountAction(
  gameId: string,
  playerId: string,
  targetCount: number,
  defaultAmount: number,
): Promise<void> {
  if (targetCount < 0) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: buyIns, error } = await supabase
    .from('buy_ins')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .eq('amount', defaultAmount)
    .order('created_at')

  if (error) throw error

  const currentCount = buyIns?.length ?? 0
  const diff = targetCount - currentCount

  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      await addBuyInAction(gameId, playerId, defaultAmount)
    }
  } else if (diff < 0) {
    for (let i = 0; i < Math.abs(diff); i++) {
      await removeDefaultBuyInAction(gameId, playerId, defaultAmount)
    }
  }
}

export async function addExpenseAction(
  gameId: string,
  paidByPlayerId: string,
  amount: number,
  description: string,
  splitType: ExpenseSplitType,
  participants: { playerId: string; amountOwed: number }[],
): Promise<Expense> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const expense = await dbAddExpense(
    supabase,
    gameId,
    paidByPlayerId,
    amount,
    description,
    splitType,
    user.id,
    participants,
  )

  try {
    await addGameEvent(supabase, gameId, 'expense_added', user.id, {
      playerId: paidByPlayerId,
      amount,
      description,
    })
  } catch {
    // game_events table may not exist yet
  }

  return expense
}

export async function closeGameAction(
  gameId: string,
  cashOuts: { playerId: string; amount: number }[],
  results: Omit<GameResult, 'id' | 'created_at'>[],
  settlements: SettlementTransfer[],
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await Promise.all(
    cashOuts.map((co) =>
      dbUpsertCashOut(supabase, gameId, co.playerId, co.amount, user.id),
    ),
  )

  await dbSaveGameResults(supabase, gameId, results, settlements)
  await dbCloseGame(supabase, gameId)
}

export async function finalizeGameAction(
  gameId: string,
  groupId: string,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const game = await dbGetGame(supabase, gameId)
  if (!game) throw new Error('Game not found')
  if (game.group_id !== groupId) throw new Error('Invalid group')
  if (game.status !== 'closed') throw new Error('Game is not closed yet')

  if (game.finalized_at) {
    revalidatePath(`/groups/${groupId}`)
    return
  }

  const results = await getGameResults(supabase, gameId)
  if (results.length === 0) throw new Error('No results to finalize')

  const didFinalize = await dbFinalizeGame(supabase, gameId)
  if (!didFinalize) {
    revalidatePath(`/groups/${groupId}`)
    return
  }

  try {
    await applyGameStats(supabase, groupId, gameId, results)
  } catch (err) {
    await supabase
      .from('games')
      .update({ finalized_at: null })
      .eq('id', gameId)
    throw err
  }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/games/${gameId}/results`)
}
