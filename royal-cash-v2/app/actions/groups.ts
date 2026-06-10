'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveUserDisplayName } from '@/lib/auth/display-name'
import { createGroup as dbCreateGroup, archiveGroup as dbArchiveGroup } from '@/lib/db/groups'
import { createPlayer } from '@/lib/db/players'
import type { Group } from '@/lib/domain/types'

export async function createGroupAction(name: string): Promise<Group> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const group = await dbCreateGroup(supabase, name, user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = resolveUserDisplayName(profile, user)

  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', group.id)
    .eq('linked_user_id', user.id)
    .maybeSingle()

  if (!existingPlayer) {
    await createPlayer(supabase, group.id, displayName, undefined, user.id)
  }

  revalidatePath('/groups')
  revalidatePath(`/groups/${group.id}`)
  return group
}

export async function archiveGroupAction(groupId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .maybeSingle()

  if (!group || group.owner_id !== user.id) {
    throw new Error('Not authorized')
  }

  await dbArchiveGroup(supabase, groupId)
  revalidatePath('/groups')
}
