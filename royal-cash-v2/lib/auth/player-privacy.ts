import type { SupabaseClient } from '@supabase/supabase-js'

export async function canViewPlayerPrivateData(
  supabase: SupabaseClient,
  playerId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: player, error } = await supabase
    .from('players')
    .select('linked_user_id')
    .eq('id', playerId)
    .maybeSingle()

  if (error) throw error
  return player?.linked_user_id === user.id
}
