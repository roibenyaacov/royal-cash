'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPlayer as dbCreatePlayer, removePlayer as dbRemovePlayer, linkPlayerToSelf } from '@/lib/db/players'
import { assertGroupMember } from '@/lib/server/authorize-game'
import type { Player } from '@/lib/domain/types'

export async function createPlayerAction(
  groupId: string,
  displayName: string,
  phone?: string,
): Promise<Player> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await assertGroupMember(supabase, groupId, user.id)

  return dbCreatePlayer(supabase, groupId, displayName, phone)
}

export async function linkPlayerToSelfAction(playerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await linkPlayerToSelf(supabase, playerId)
  if (result.success) {
    revalidatePath(`/groups/${result.groupId}`)
    revalidatePath('/profile')
  }
  return result
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
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Not a group member')

  await dbRemovePlayer(supabase, playerId)
  revalidatePath(`/groups/${groupId}`)
}
