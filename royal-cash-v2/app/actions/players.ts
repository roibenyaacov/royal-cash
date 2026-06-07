'use server'

import { createClient } from '@/lib/supabase/server'
import { createPlayer as dbCreatePlayer } from '@/lib/db/players'
import type { Player } from '@/lib/domain/types'

export async function createPlayerAction(
  groupId: string,
  displayName: string,
  phone?: string,
): Promise<Player> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  return dbCreatePlayer(supabase, groupId, displayName, phone)
}
