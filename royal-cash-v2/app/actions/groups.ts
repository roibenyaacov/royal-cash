'use server'

import { createClient } from '@/lib/supabase/server'
import { createGroup as dbCreateGroup } from '@/lib/db/groups'
import type { Group } from '@/lib/domain/types'

export async function createGroupAction(name: string): Promise<Group> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  return dbCreateGroup(supabase, name, user.id)
}
