import type { SupabaseClient } from '@supabase/supabase-js'
import type { Group } from '@/lib/domain/types'

export async function getGroups(supabase: SupabaseClient): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (error) return null
  return data
}

export async function createGroup(
  supabase: SupabaseClient,
  name: string,
  ownerId: string,
): Promise<Group> {
  const groupId = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error: insertError } = await supabase
    .from('groups')
    .insert({ id: groupId, name, owner_id: ownerId })

  if (insertError) throw insertError

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: ownerId, role: 'owner' })

  if (memberError) throw memberError

  const { data, error: selectError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (selectError) throw selectError
  return data
}
