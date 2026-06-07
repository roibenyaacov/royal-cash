import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PlayerClaimInvite,
  GroupInvite,
  GameAccessLink,
  GameAccessLevel,
} from '@/lib/domain/types'

// ============================================
// Player Claim Invites
// ============================================

export async function createPlayerClaimInvite(
  supabase: SupabaseClient,
  playerId: string,
  token: string,
  createdBy: string,
  expiresAt: Date,
): Promise<PlayerClaimInvite> {
  const { data, error } = await supabase
    .from('player_claim_invites')
    .insert({
      player_id: playerId,
      token,
      created_by: createdBy,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPlayerClaimInvites(
  supabase: SupabaseClient,
  playerId: string,
): Promise<PlayerClaimInvite[]> {
  const { data, error } = await supabase
    .from('player_claim_invites')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function revokePlayerClaimInvite(
  supabase: SupabaseClient,
  inviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from('player_claim_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) throw error
}

export async function claimPlayer(
  supabase: SupabaseClient,
  token: string,
): Promise<{ success?: boolean; group_id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('claim_player', {
    claim_token: token,
  })

  if (error) throw error
  return data
}

// ============================================
// Group Invites
// ============================================

export async function createGroupInvite(
  supabase: SupabaseClient,
  groupId: string,
  token: string,
  createdBy: string,
  options?: {
    role?: 'manager' | 'member'
    expiresAt?: Date
    maxUses?: number
  },
): Promise<GroupInvite> {
  const { data, error } = await supabase
    .from('group_invites')
    .insert({
      group_id: groupId,
      token,
      created_by: createdBy,
      role: options?.role ?? 'member',
      expires_at: options?.expiresAt?.toISOString() ?? null,
      max_uses: options?.maxUses ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getGroupInvites(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupInvite[]> {
  const { data, error } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function revokeGroupInvite(
  supabase: SupabaseClient,
  inviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from('group_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) throw error
}

export async function acceptGroupInvite(
  supabase: SupabaseClient,
  token: string,
): Promise<{ success?: boolean; group_id?: string; already_member?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('accept_group_invite', {
    invite_token: token,
  })

  if (error) throw error
  return data
}

// ============================================
// Game Access Links
// ============================================

export async function createGameAccessLink(
  supabase: SupabaseClient,
  gameId: string,
  token: string,
  createdBy: string,
  options?: {
    expiresAt?: Date
    accessLevel?: GameAccessLevel
  },
): Promise<GameAccessLink> {
  const { data, error } = await supabase
    .from('game_access_links')
    .insert({
      game_id: gameId,
      token,
      created_by: createdBy,
      expires_at: options?.expiresAt?.toISOString() ?? null,
      access_level: options?.accessLevel ?? 'view',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function revokeGameAccessLink(
  supabase: SupabaseClient,
  linkId: string,
): Promise<void> {
  const { error } = await supabase
    .from('game_access_links')
    .update({ status: 'revoked' })
    .eq('id', linkId)

  if (error) throw error
}

export async function validateGameAccess(
  supabase: SupabaseClient,
  token: string,
): Promise<{ success?: boolean; game_id?: string; group_id?: string; access_level?: string; error?: string }> {
  const { data, error } = await supabase.rpc('validate_game_access', {
    access_token: token,
  })

  if (error) throw error
  return data
}
