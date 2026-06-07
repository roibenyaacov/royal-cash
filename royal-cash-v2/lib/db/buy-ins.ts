import type { SupabaseClient } from '@supabase/supabase-js'
import type { BuyIn } from '@/lib/domain/types'

export async function getGameBuyIns(
  supabase: SupabaseClient,
  gameId: string,
): Promise<BuyIn[]> {
  const { data, error } = await supabase
    .from('buy_ins')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function addBuyIn(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
  amount: number,
  createdBy: string,
  note?: string,
): Promise<BuyIn> {
  const { data, error } = await supabase
    .from('buy_ins')
    .insert({
      game_id: gameId,
      player_id: playerId,
      amount,
      created_by: createdBy,
      note: note ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeLatestBuyIn(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string,
  amount?: number,
): Promise<BuyIn | null> {
  let query = supabase
    .from('buy_ins')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (amount !== undefined) {
    query = supabase
      .from('buy_ins')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .eq('amount', amount)
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const { data: rows, error: selectError } = await query
  if (selectError) throw selectError
  if (!rows || rows.length === 0) return null

  const target = rows[0]
  const { error: deleteError } = await supabase
    .from('buy_ins')
    .delete()
    .eq('id', target.id)

  if (deleteError) throw deleteError
  return target
}
