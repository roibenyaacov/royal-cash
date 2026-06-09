'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createGroup as dbCreateGroup, archiveGroup as dbArchiveGroup } from '@/lib/db/groups'
import type { Group } from '@/lib/domain/types'

export async function createGroupAction(name: string): Promise<Group> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  return dbCreateGroup(supabase, name, user.id)
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
