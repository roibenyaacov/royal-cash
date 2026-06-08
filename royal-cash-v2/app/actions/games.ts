'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
import {
  assertPlayerInActiveGame,
  authorizeActiveGameMutation,
} from '@/lib/server/authorize-game'
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

  const db = createAdminClient()

  await Promise.all(
    playerIds.map((id) => dbAddGamePlayer(db, game.id, id)),
  )

  for (const playerId of playerIds) {
    await dbAddBuyIn(db, game.id, playerId, defaultBuyIn, user.id)
    await addGameEvent(db, game.id, 'buy_in_added', user.id, {
      playerId,
      amount: defaultBuyIn,
      description: 'כניסה ראשונית',
    })
  }

  return game
}

export async function addPlayerToGameAction(
  gameId: string,
  playerId: string,
  buyInAmount: number,
): Promise<void> {
  const { userId, db } = await authorizeActiveGameMutation(gameId)

  await dbAddGamePlayer(db, gameId, playerId)
  await dbAddBuyIn(db, gameId, playerId, buyInAmount, userId)

  await addGameEvent(db, gameId, 'buy_in_added', userId, {
    playerId,
    amount: buyInAmount,
    description: 'הצטרפות למשחק',
  })
}

export async function addBuyInAction(
  gameId: string,
  playerId: string,
  amount: number,
  note?: string,
): Promise<BuyIn> {
  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  const buyIn = await dbAddBuyIn(db, gameId, playerId, amount, userId, note)

  await addGameEvent(db, gameId, 'buy_in_added', userId, {
    playerId,
    amount,
    description: note ?? undefined,
  })

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
  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  const removed = await removeLatestBuyIn(
    db,
    gameId,
    playerId,
    defaultAmount,
  )
  if (!removed) return null

  await addGameEvent(db, gameId, 'buy_in_removed', userId, {
    playerId,
    amount: removed.amount,
  })

  return removed
}

export async function setPlayerBuyInCountAction(
  gameId: string,
  playerId: string,
  targetCount: number,
  defaultAmount: number,
): Promise<void> {
  if (targetCount < 0) return

  const { db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  const { data: buyIns, error } = await db
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
  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, paidByPlayerId)

  for (const participant of participants) {
    await assertPlayerInActiveGame(db, gameId, participant.playerId)
  }

  const expense = await dbAddExpense(
    db,
    gameId,
    paidByPlayerId,
    amount,
    description,
    splitType,
    userId,
    participants,
  )

  await addGameEvent(db, gameId, 'expense_added', userId, {
    playerId: paidByPlayerId,
    amount,
    description: description.trim() || undefined,
  })

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

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) throw new Error('Not a group member')

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
    await applyGameStats(createAdminClient(), groupId, gameId, results)
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
