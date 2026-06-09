'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPlayer as dbCreatePlayer, removePlayer as dbRemovePlayer } from '@/lib/db/players'
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

export async function removePlayerAction(
  groupId: string,
  playerId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !['owner', 'manager'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  await dbRemovePlayer(supabase, playerId)
  revalidatePath(`/groups/${groupId}`)
}
