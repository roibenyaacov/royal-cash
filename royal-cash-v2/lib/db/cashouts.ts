import type { SupabaseClient } from '@supabase/supabase-js'
import type { CashOut } from '@/lib/domain/types'

export async function getGameCashOuts(
  supabase: SupabaseClient,
  gameId: string,
): Promise<CashOut[]> {
  const { data, error } = await supabase
    .from('cash_outs')
    .select('*')
    .eq('game_id', gameId)

  if (error) throw error
  return data ?? []
}

export async function upsertCashOut(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
  amount: number,
  createdBy: string,
): Promise<CashOut> {
  const { data, error } = await supabase
    .from('cash_outs')
    .upsert(
      {
        game_id: gameId,
        player_id: playerId,
        amount,
        created_by: createdBy,
      },
      { onConflict: 'game_id,player_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCashOut(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cash_outs')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)

  if (error) throw error
}
