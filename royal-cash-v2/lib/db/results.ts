import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameResult, Settlement } from '@/lib/domain/types'
import type { SettlementTransfer } from '@/lib/calculations/settlement'

export async function saveGameResults(
  supabase: SupabaseClient,
  gameId: string,
  results: Omit<GameResult, 'id' | 'created_at'>[],
  settlements: SettlementTransfer[],
): Promise<void> {
  const { error: rError } = await supabase.from('game_results').insert(
    results.map((r) => ({
      game_id: gameId,
      player_id: r.player_id,
      total_buy_in: r.total_buy_in,
      cash_out: r.cash_out,
      game_net: r.game_net,
      expense_credit: r.expense_credit,
      expense_debt: r.expense_debt,
      final_balance: r.final_balance,
    })),
  )

  if (rError) throw rError

  if (settlements.length > 0) {
    const { error: sError } = await supabase.from('settlements').insert(
      settlements.map((s) => ({
        game_id: gameId,
        from_player_id: s.from,
        to_player_id: s.to,
        amount: s.amount,
      })),
    )

    if (sError) throw sError
  }
}

export async function getGameResults(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GameResult[]> {
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .eq('game_id', gameId)

  if (error) throw error
  return data ?? []
}

export async function getGameSettlements(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('game_id', gameId)

  if (error) throw error
  return data ?? []
}
