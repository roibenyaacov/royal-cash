import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameEvent, GameEventType } from '@/lib/domain/types'

export async function getGameEvents(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GameEvent[]> {
  const { data, error } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addGameEvent(
  supabase: SupabaseClient,
  gameId: string,
  eventType: GameEventType,
  createdBy: string,
  options?: {
    playerId?: string
    amount?: number
    description?: string
    // Optional client-generated id so the optimistic event and the persisted
    // event share an identity (same idempotency benefit as buy-ins).
    id?: string
  },
): Promise<GameEvent> {
  const { data, error } = await supabase
    .from('game_events')
    .insert({
      ...(options?.id ? { id: options.id } : {}),
      game_id: gameId,
      event_type: eventType,
      player_id: options?.playerId ?? null,
      amount: options?.amount ?? null,
      description: options?.description ?? null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
