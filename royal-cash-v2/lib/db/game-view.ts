import type { SupabaseClient } from '@supabase/supabase-js'
import type { Currency, GameEvent, GameEventType } from '@/lib/domain/types'

export type GameViewPlayer = {
  id: string
  display_name: string
  total_buy_ins: number
}

export type GameViewExpenseParticipant = {
  player_name: string
  amount_owed: number
}

export type GameViewExpense = {
  id: string
  description: string | null
  amount: number
  split_type: string
  paid_by_name: string
  participants: GameViewExpenseParticipant[]
}

export type GameViewResult = {
  player_id: string
  player_name: string
  final_balance: number
  total_buy_in: number
  cash_out: number
}

export type GameViewSettlement = {
  from_player_name: string
  to_player_name: string
  amount: number
}

export type GameViewSnapshot = {
  game_id: string
  group_id: string
  game: {
    id: string
    name: string
    date: string
    status: string
    currency: Currency
    default_buy_in: number
    finalized_at: string | null
  }
  players: GameViewPlayer[]
  expenses: GameViewExpense[]
  events: GameEvent[]
  results: GameViewResult[]
  settlements: GameViewSettlement[]
}

export async function getGameViewByAccessToken(
  supabase: SupabaseClient,
  accessToken: string,
): Promise<GameViewSnapshot | { error: string }> {
  const { data, error } = await supabase.rpc('get_game_view_by_access_token', {
    access_token: accessToken,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') return { error: 'invalid_or_revoked_token' }

  const payload = data as Record<string, unknown>
  if (payload.error) return { error: String(payload.error) }
  if (!payload.success) return { error: 'invalid_or_revoked_token' }

  const rawEvents = (payload.events as Record<string, unknown>[] | undefined) ?? []

  return {
    game_id: String(payload.game_id),
    group_id: String(payload.group_id),
    game: payload.game as GameViewSnapshot['game'],
    players: (payload.players as GameViewPlayer[]) ?? [],
    expenses: (payload.expenses as GameViewExpense[]) ?? [],
    events: rawEvents.map((e) => ({
      id: String(e.id),
      game_id: String(payload.game_id),
      event_type: e.event_type as GameEventType,
      player_id: e.player_id ? String(e.player_id) : null,
      amount: typeof e.amount === 'number' ? e.amount : null,
      description: e.description ? String(e.description) : null,
      created_by: '',
      created_at: String(e.created_at),
    })),
    results: (payload.results as GameViewResult[]) ?? [],
    settlements: (payload.settlements as GameViewSettlement[]) ?? [],
  }
}
