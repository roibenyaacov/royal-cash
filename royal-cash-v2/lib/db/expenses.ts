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

export async function getGameExpensesWithParticipants(
  supabase: SupabaseClient,
  gameId: string,
): Promise<{ expenses: Expense[]; participants: ExpenseParticipant[] }> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_participants(*)')
    .eq('game_id', gameId)
    .order('created_at')

  if (error) throw error
  const rows = data ?? []

  const expenses: Expense[] = rows.map((row) => {
    const { expense_participants: _participants, ...rest } = row
    void _participants
    return rest as Expense
  })
  const participants: ExpenseParticipant[] = rows.flatMap(
    (r) => (r.expense_participants as ExpenseParticipant[]) ?? [],
  )

  return { expenses, participants }
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
): Promise<{ expense: Expense; participants: ExpenseParticipant[] }> {
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

  const { data: insertedParticipants, error: pError } = await supabase
    .from('expense_participants')
    .insert(
      participants.map((p) => ({
        expense_id: expense.id,
        player_id: p.playerId,
        amount_owed: p.amountOwed,
      })),
    )
    .select()

  if (pError) throw pError
  return { expense, participants: insertedParticipants ?? [] }
}
