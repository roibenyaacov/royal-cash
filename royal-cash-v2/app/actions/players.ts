'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPlayer as dbCreatePlayer, removePlayer as dbRemovePlayer, linkPlayerToSelf } from '@/lib/db/players'
import { assertGroupMember, assertGroupOwner } from '@/lib/server/authorize-game'
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

  await assertGroupOwner(supabase, groupId, user.id)

  const { data: player } = await supabase
    .from('players')
    .select('group_id, is_active')
    .eq('id', playerId)
    .maybeSingle()

  if (!player || player.group_id !== groupId) {
    throw new Error('Player not found')
  }
  if (!player.is_active) return

  await dbRemovePlayer(supabase, playerId)
  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/players/${playerId}`)
}
