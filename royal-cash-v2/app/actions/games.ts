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
  getGamePlayers as dbGetGamePlayers,
} from '@/lib/db/games'
import { createPlayer as dbCreatePlayer } from '@/lib/db/players'
import {
  addBuyIn as dbAddBuyIn,
  getGameBuyIns as dbGetGameBuyIns,
  removeLatestBuyIn,
} from '@/lib/db/buy-ins'
import {
  addExpense as dbAddExpense,
  getGameExpensesWithParticipants as dbGetGameExpensesWithParticipants,
} from '@/lib/db/expenses'
import { upsertCashOut as dbUpsertCashOut } from '@/lib/db/cashouts'
import { saveGameResults as dbSaveGameResults, getGameResults } from '@/lib/db/results'
import { applyGameStats } from '@/lib/db/stats'
import { addGameEvent } from '@/lib/db/game-events'
import {
  assertPlayerInActiveGame,
  assertGroupMember,
  authorizeActiveGameMutation,
} from '@/lib/server/authorize-game'
import { calcAllPlayerBalances } from '@/lib/calculations/balance'
import { calcSettlements } from '@/lib/calculations/settlement'
import { validateGameForClose } from '@/lib/calculations/validation'
import type {
  Game,
  GameEvent,
  Player,
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
  Currency,
  ManagementMode,
  ExpenseSplitType,
} from '@/lib/domain/types'

const MAX_GAME_NAME_LENGTH = 80
const MAX_EXPENSE_DESCRIPTION_LENGTH = 120
const MAX_NOTE_LENGTH = 200

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

  if (!Number.isInteger(defaultBuyIn) || defaultBuyIn <= 0) {
    throw new Error('Invalid default buy-in')
  }
  if (playerIds.length === 0) {
    throw new Error('At least one player required')
  }

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Game name required')
  if (trimmedName.length > MAX_GAME_NAME_LENGTH) {
    throw new Error('Game name too long')
  }

  await assertGroupMember(supabase, groupId, user.id)

  const game = await dbCreateGame(supabase, {
    group_id: groupId,
    name: trimmedName,
    date: new Date().toISOString().split('T')[0],
    default_buy_in: defaultBuyIn,
    currency,
    status: 'active',
    management_mode: 'host_only' as ManagementMode,
    created_by: user.id,
  })

  // All writes go through the user's client; RLS (migration 017) lets any
  // group member insert game_players / buy_ins / game_events.
  await Promise.all(
    playerIds.map((id) => dbAddGamePlayer(supabase, game.id, id)),
  )

  for (const playerId of playerIds) {
    await dbAddBuyIn(supabase, game.id, playerId, defaultBuyIn, user.id)
    await addGameEvent(supabase, game.id, 'buy_in_added', user.id, {
      playerId,
      amount: defaultBuyIn,
      description: 'כניסה ראשונית',
    })
  }

  return game
}

export type AddPlayerToGameResult = {
  buyIn: BuyIn | null
  event: GameEvent | null
}

export async function addPlayerToGameAction(
  gameId: string,
  playerId: string,
  buyInAmount: number,
): Promise<AddPlayerToGameResult> {
  const { userId, db } = await authorizeActiveGameMutation(gameId)

  await dbAddGamePlayer(db, gameId, playerId)

  if (buyInAmount > 0) {
    const buyIn = await dbAddBuyIn(db, gameId, playerId, buyInAmount, userId)
    const event = await addGameEvent(db, gameId, 'buy_in_added', userId, {
      playerId,
      amount: buyInAmount,
      description: 'הצטרפות למשחק',
    })
    return { buyIn, event }
  }

  return { buyIn: null, event: null }
}

export type AddNewPlayerToGameResult = {
  player: Player
  buyIn: BuyIn | null
  event: GameEvent | null
}

export async function addNewPlayerToGameAction(
  groupId: string,
  gameId: string,
  displayName: string,
  options: { addToGroup: boolean; initialBuyIn: number },
): Promise<AddNewPlayerToGameResult> {
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
    const buyIn = await dbAddBuyIn(db, gameId, player.id, options.initialBuyIn, userId)
    const event = await addGameEvent(db, gameId, 'buy_in_added', userId, {
      playerId: player.id,
      amount: options.initialBuyIn,
      description: 'הצטרפות למשחק',
    })
    return { player, buyIn, event }
  }

  return { player, buyIn: null, event: null }
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

export type AddBuyInResult = { buyIn: BuyIn; event: GameEvent }

export async function addBuyInAction(
  gameId: string,
  playerId: string,
  amount: number,
  note?: string,
): Promise<AddBuyInResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Invalid buy-in amount')
  }
  const trimmedNote = note?.trim() || undefined
  if (trimmedNote && trimmedNote.length > MAX_NOTE_LENGTH) {
    throw new Error('Note too long')
  }

  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  const buyIn = await dbAddBuyIn(db, gameId, playerId, amount, userId, trimmedNote)

  const event = await addGameEvent(db, gameId, 'buy_in_added', userId, {
    playerId,
    amount,
    description: trimmedNote ?? undefined,
  })

  return { buyIn, event }
}

export async function addDefaultBuyInAction(
  gameId: string,
  playerId: string,
  defaultAmount: number,
): Promise<AddBuyInResult> {
  return addBuyInAction(gameId, playerId, defaultAmount)
}

export type RemoveDefaultBuyInResult = {
  removedBuyIn: BuyIn
  removeEvent: GameEvent
  // Present when removing the last buy-in also drops the player from the table.
  playerRemoved?: { event: GameEvent }
}

export async function removeDefaultBuyInAction(
  gameId: string,
  playerId: string,
  defaultAmount: number,
): Promise<RemoveDefaultBuyInResult | null> {
  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, playerId)

  const removed = await removeLatestBuyIn(
    db,
    gameId,
    playerId,
    defaultAmount,
  )
  if (!removed) return null

  const removeEvent = await addGameEvent(db, gameId, 'buy_in_removed', userId, {
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
    const playerRemovedEvent = await addGameEvent(
      db,
      gameId,
      'buy_in_removed',
      userId,
      { playerId, description: 'הוסר מהשולחן' },
    )
    return {
      removedBuyIn: removed,
      removeEvent,
      playerRemoved: { event: playerRemovedEvent },
    }
  }

  return { removedBuyIn: removed, removeEvent }
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

export type AddExpenseResult = {
  expense: Expense
  participants: ExpenseParticipant[]
  event: GameEvent
}

export async function addExpenseAction(
  gameId: string,
  paidByPlayerId: string,
  amount: number,
  description: string,
  splitType: ExpenseSplitType,
  participants: { playerId: string; amountOwed: number }[],
): Promise<AddExpenseResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Invalid expense amount')
  }

  const trimmedDescription = description.trim()
  if (trimmedDescription.length > MAX_EXPENSE_DESCRIPTION_LENGTH) {
    throw new Error('Expense description too long')
  }

  if (participants.length === 0) {
    throw new Error('Expense participants required')
  }

  let participantSum = 0
  for (const p of participants) {
    if (!Number.isInteger(p.amountOwed) || p.amountOwed < 0) {
      throw new Error('Invalid expense participant amount')
    }
    participantSum += p.amountOwed
  }
  if (participantSum !== amount) {
    throw new Error('Expense participants must sum to expense amount')
  }

  const { userId, db } = await authorizeActiveGameMutation(gameId)
  await assertPlayerInActiveGame(db, gameId, paidByPlayerId)

  for (const participant of participants) {
    await assertPlayerInActiveGame(db, gameId, participant.playerId)
  }

  const { expense, participants: insertedParticipants } = await dbAddExpense(
    db,
    gameId,
    paidByPlayerId,
    amount,
    trimmedDescription,
    splitType,
    userId,
    participants,
  )

  const event = await addGameEvent(db, gameId, 'expense_added', userId, {
    playerId: paidByPlayerId,
    amount,
    description: trimmedDescription || undefined,
  })

  return { expense, participants: insertedParticipants, event }
}

export async function closeGameAction(
  gameId: string,
  cashOuts: { playerId: string; amount: number }[],
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const game = await dbGetGame(supabase, gameId)
  if (!game) throw new Error('Game not found')

  await assertGroupMember(supabase, game.group_id, user.id)

  // Idempotent retry: a network blip, a React re-mount, or the user
  // hitting Back+Submit can hand us the same close request twice. The
  // first call already committed status='closed' + results, so the
  // second call should silently succeed (matches the atomic RPC's
  // already_closed branch) instead of confusing the user with
  // "Game is not active".
  if (game.status === 'closed') {
    const { data: existingResult } = await supabase
      .from('game_results')
      .select('id')
      .eq('game_id', gameId)
      .limit(1)
      .maybeSingle()
    if (existingResult) {
      revalidatePath(`/groups/${game.group_id}`)
      revalidatePath(`/groups/${game.group_id}/games/${gameId}/results`)
      return
    }
    // Status='closed' with no results is an inconsistent state. Fall
    // through and let the RPC (or fallback writes) recover by writing
    // the results that were missed.
  } else if (game.status !== 'active') {
    throw new Error('Game is not active')
  }

  // Validate every cash-out amount before doing anything to the DB.
  for (const co of cashOuts) {
    if (
      !Number.isFinite(co.amount) ||
      !Number.isInteger(co.amount) ||
      co.amount < 0
    ) {
      throw new Error('Invalid cash-out amount')
    }
  }

  // Recompute everything from the database — never trust client-supplied
  // results or settlements. The close client sends only cash-out amounts.
  const [gamePlayers, buyIns, { expenses, participants }] = await Promise.all([
    dbGetGamePlayers(supabase, gameId),
    dbGetGameBuyIns(supabase, gameId),
    dbGetGameExpensesWithParticipants(supabase, gameId),
  ])

  // Only players with at least one buy-in are part of the close — matches
  // the roster the close screen renders.
  const buyInPlayerIds = new Set(buyIns.map((b) => b.player_id))
  const rosterIds = gamePlayers
    .map((gp) => gp.player_id)
    .filter((id) => buyInPlayerIds.has(id))
  const rosterIdSet = new Set(rosterIds)

  for (const co of cashOuts) {
    if (!rosterIdSet.has(co.playerId)) {
      throw new Error('Cash-out for player not in game')
    }
  }

  const participantsByExpense = new Map<string, ExpenseParticipant[]>()
  for (const ep of participants) {
    const list = participantsByExpense.get(ep.expense_id) ?? []
    list.push(ep)
    participantsByExpense.set(ep.expense_id, list)
  }

  const nowIso = new Date().toISOString()
  const cashOutEntries: CashOut[] = cashOuts.map((co) => ({
    id: '',
    game_id: gameId,
    player_id: co.playerId,
    amount: co.amount,
    created_by: user.id,
    created_at: nowIso,
    updated_at: nowIso,
  }))

  const validation = validateGameForClose(
    rosterIds,
    buyIns,
    cashOutEntries,
    expenses,
    participantsByExpense,
  )
  if (!validation.valid) {
    throw new Error('validation_failed')
  }

  const results = calcAllPlayerBalances(
    rosterIds,
    buyIns,
    cashOutEntries,
    expenses,
    participantsByExpense,
    gameId,
  )
  const settlements = calcSettlements(
    results.map((r) => ({ playerId: r.player_id, amount: r.final_balance })),
  )

  // Prefer the atomic RPC (migration 021). It handles cash-outs, results,
  // settlements, and the status change inside one Postgres transaction —
  // a failure leaves nothing partially written. Falls back to the
  // sequential writes if the RPC isn't deployed yet.
  const rpc = await supabase.rpc('close_game_atomic', {
    p_game_id: gameId,
    p_cash_outs: cashOuts.map((co) => ({
      player_id: co.playerId,
      amount: co.amount,
    })),
    p_results: results.map((r) => ({
      player_id: r.player_id,
      total_buy_in: r.total_buy_in,
      cash_out: r.cash_out,
      game_net: r.game_net,
      expense_credit: r.expense_credit,
      expense_debt: r.expense_debt,
      final_balance: r.final_balance,
    })),
    p_settlements: settlements.map((s) => ({
      from_player_id: s.from,
      to_player_id: s.to,
      amount: s.amount,
    })),
  })

  const rpcMissing =
    rpc.error &&
    (rpc.error.code === 'PGRST202' ||
      rpc.error.message?.includes('close_game_atomic'))

  if (!rpcMissing) {
    if (rpc.error) throw new Error(rpc.error.message)
    const payload = rpc.data as { success?: boolean; error?: string } | null
    if (payload?.error) {
      throw new Error(payload.error)
    }
  } else {
    // Pre-021 fallback — not atomic, but functionally equivalent.
    await Promise.all(
      cashOuts.map((co) =>
        dbUpsertCashOut(supabase, gameId, co.playerId, co.amount, user.id),
      ),
    )
    await dbSaveGameResults(supabase, gameId, results, settlements)
    await dbCloseGame(supabase, gameId)
  }

  revalidatePath(`/groups/${game.group_id}`)
  revalidatePath(`/groups/${game.group_id}/games/${gameId}`)
  revalidatePath(`/groups/${game.group_id}/games/${gameId}/results`)
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

  // Prefer the atomic RPC (migration 021): mark finalized + stats upsert
  // + win-records insert in one transaction. Falls back to the legacy
  // two-step path (with a manual rollback) when the RPC isn't deployed.
  const rpc = await supabase.rpc('finalize_game_with_stats', {
    p_game_id: gameId,
    p_group_id: groupId,
  })

  const rpcMissing =
    rpc.error &&
    (rpc.error.code === 'PGRST202' ||
      rpc.error.message?.includes('finalize_game_with_stats'))

  if (!rpcMissing) {
    if (rpc.error) throw new Error(rpc.error.message)
    const payload = rpc.data as { success?: boolean; error?: string } | null
    if (payload?.error) {
      if (payload.error === 'no_results') {
        throw new Error('No results to finalize')
      }
      throw new Error(payload.error)
    }
  } else {
    // Pre-021 fallback path.
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
      // Best-effort rollback — note: any group_win_records inserted before
      // the failure remain, which is exactly why the atomic RPC is preferred.
      await supabase
        .from('games')
        .update({ finalized_at: null })
        .eq('id', gameId)
      throw err
    }
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
