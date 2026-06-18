'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createGame as dbCreateGame,
  addGamePlayer as dbAddGamePlayer,
  removeGamePlayer as dbRemoveGamePlayer,
  closeGame as dbCloseGame,
  deleteGame as dbDeleteGame,
  finalizeGame as dbFinalizeGame,
  getGame as dbGetGame,
} from '@/lib/db/games'
import { createPlayer as dbCreatePlayer } from '@/lib/db/players'
import { addBuyIn as dbAddBuyIn, removeLatestBuyIn } from '@/lib/db/buy-ins'
import { addExpense as dbAddExpense } from '@/lib/db/expenses'
import { upsertCashOut as dbUpsertCashOut } from '@/lib/db/cashouts'
import { saveGameResults as dbSaveGameResults, getGameResults } from '@/lib/db/results'
import { applyGameStats } from '@/lib/db/stats'
import { addGameEvent } from '@/lib/db/game-events'
import {
  assertPlayerInActiveGame,
  assertGroupMember,
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

  await assertGroupMember(supabase, groupId, user.id)

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

  if (buyInAmount > 0) {
    await dbAddBuyIn(db, gameId, playerId, buyInAmount, userId)
    await addGameEvent(db, gameId, 'buy_in_added', userId, {
      playerId,
      amount: buyInAmount,
      description: 'הצטרפות למשחק',
    })
  }
}

export async function addNewPlayerToGameAction(
  groupId: string,
  gameId: string,
  displayName: string,
  options: { addToGroup: boolean; initialBuyIn: number },
): Promise<void> {
  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('Player name required')

  const { userId, db, game } = await authorizeActiveGameMutation(gameId)
  if (game.group_id !== groupId) throw new Error('Invalid group')

  const player = await dbCreatePlayer(
    db,
    groupId,
    trimmed,
    undefined,
    undefined,
    options.addToGroup,
  )

  await dbAddGamePlayer(db, gameId, player.id)

  if (options.initialBuyIn > 0) {
    await dbAddBuyIn(db, gameId, player.id, options.initialBuyIn, userId)
    await addGameEvent(db, gameId, 'buy_in_added', userId, {
      playerId: player.id,
      amount: options.initialBuyIn,
      description: 'הצטרפות למשחק',
    })
  }
}

async function playerHasGameExpenses(
  db: Awaited<ReturnType<typeof authorizeActiveGameMutation>>['db'],
  gameId: string,
  playerId: string,
): Promise<boolean> {
  const { data: paidExpenses, error: paidError } = await db
    .from('expenses')
    .select('id')
    .eq('game_id', gameId)
    .eq('paid_by_player_id', playerId)
    .limit(1)

  if (paidError) throw paidError
  if (paidExpenses?.length) return true

  const { data: expenses, error: expensesError } = await db
    .from('expenses')
    .select('id')
    .eq('game_id', gameId)

  if (expensesError) throw expensesError
  if (!expenses?.length) return false

  const expenseIds = expenses.map((e) => e.id)
  const { data: participants, error: participantsError } = await db
    .from('expense_participants')
    .select('id')
    .in('expense_id', expenseIds)
    .eq('player_id', playerId)
    .limit(1)

  if (participantsError) throw participantsError
  return (participants?.length ?? 0) > 0
}

export async function removePlayerFromGameAction(
  gameId: string,
  playerId: string,
): Promise<{ success: true } | { success: false; error: 'has_expenses' }> {
  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  if (await playerHasGameExpenses(db, gameId, playerId)) {
    return { success: false, error: 'has_expenses' }
  }

  const { error: buyInDeleteError } = await db
    .from('buy_ins')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)

  if (buyInDeleteError) throw buyInDeleteError

  await dbRemoveGamePlayer(db, gameId, playerId)

  await addGameEvent(db, gameId, 'buy_in_removed', userId, {
    playerId,
    description: 'הוסר מהשולחן',
  })

  return { success: true }
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

  const { count, error: countError } = await db
    .from('buy_ins')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('player_id', playerId)

  if (countError) throw countError

  if (count === 0) {
    if (await playerHasGameExpenses(db, gameId, playerId)) {
      await dbAddBuyIn(db, gameId, playerId, removed.amount, userId)
      throw new Error('cannot_remove_player_with_expenses')
    }

    await dbRemoveGamePlayer(db, gameId, playerId)
    await addGameEvent(db, gameId, 'buy_in_removed', userId, {
      playerId,
      description: 'הוסר מהשולחן',
    })
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

  if (targetCount === 0) {
    const result = await removePlayerFromGameAction(gameId, playerId)
    if (!result.success && result.error === 'has_expenses') {
      await addBuyInAction(gameId, playerId, defaultAmount)
      throw new Error('cannot_remove_player_with_expenses')
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

  const game = await dbGetGame(supabase, gameId)
  if (!game) throw new Error('Game not found')

  await assertGroupMember(supabase, game.group_id, user.id)

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

  await assertGroupMember(supabase, groupId, user.id)

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

export async function deleteGameAction(
  groupId: string,
  gameId: string,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await assertGroupMember(supabase, groupId, user.id)

  const game = await dbGetGame(supabase, gameId)
  if (!game) throw new Error('Game not found')
  if (game.group_id !== groupId) throw new Error('Invalid group')
  if (game.status !== 'active') throw new Error('Only active games can be deleted')

  await dbDeleteGame(supabase, gameId)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath('/groups')
}
