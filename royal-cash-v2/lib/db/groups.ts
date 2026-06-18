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

export async function archiveGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', groupId)

  if (error) throw error
}

export async function createGroup(
  supabase: SupabaseClient,
  name: string,
  ownerId: string,
): Promise<Group> {
  // Prefer the atomic RPC (migration 020) so group + owner-membership are
  // inserted in a single transaction. Falls back to the legacy two-step
  // path if the RPC isn't deployed yet — in that case orphan groups remain
  // possible until the migration is applied.
  const rpc = await supabase.rpc('create_group_with_owner', { p_name: name })
  const rpcError = rpc.error
  const rpcData = rpc.data as
    | { success?: boolean; group_id?: string; error?: string }
    | null

  const rpcMissing =
    !!rpcError &&
    (rpcError.code === 'PGRST202' ||
      rpcError.message?.includes('create_group_with_owner'))

  if (!rpcError && rpcData?.success && rpcData.group_id) {
    const { data: row, error: selectError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', rpcData.group_id)
      .single()
    if (selectError) throw selectError
    return row
  }

  if (rpcError && !rpcMissing) {
    if (rpcData?.error === 'not_authenticated') {
      throw new Error('Not authenticated')
    }
    if (rpcData?.error === 'empty_name') {
      throw new Error('Group name required')
    }
    throw new Error(rpcError.message)
  }

  // Legacy fallback — pre-migration-020 deployments only.
  const groupId = crypto.randomUUID()

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
