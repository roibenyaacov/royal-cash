import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense, ExpenseParticipant, ExpenseSplitType } from '@/lib/domain/types'

export async function getGameExpenses(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function getExpenseParticipants(
  supabase: SupabaseClient,
  expenseIds: string[],
): Promise<ExpenseParticipant[]> {
  if (expenseIds.length === 0) return []

  const { data, error } = await supabase
    .from('expense_participants')
    .select('*')
    .in('expense_id', expenseIds)

  if (error) throw error
  return data ?? []
}

export async function addExpense(
  supabase: SupabaseClient,
  gameId: string,
  paidByPlayerId: string,
  amount: number,
  description: string,
  splitType: ExpenseSplitType,
  createdBy: string,
  participants: { playerId: string; amountOwed: number }[],
): Promise<Expense> {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      game_id: gameId,
      paid_by_player_id: paidByPlayerId,
      amount,
      description,
      split_type: splitType,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error

  const { error: pError } = await supabase.from('expense_participants').insert(
    participants.map((p) => ({
      expense_id: expense.id,
      player_id: p.playerId,
      amount_owed: p.amountOwed,
    })),
  )

  if (pError) throw pError
  return expense
}
