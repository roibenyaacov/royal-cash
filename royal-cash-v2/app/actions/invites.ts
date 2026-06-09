'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateToken } from '@/lib/utils/tokens'
import {
  createPlayerClaimInvite,
  createGroupInvite,
  createGameAccessLink,
  revokePendingPlayerClaimInvites,
} from '@/lib/db/invites'
import { createPlayer } from '@/lib/db/players'
import type { GameAccessLevel } from '@/lib/domain/types'

type JoinGroupResult =
  | { success: true; groupId: string; alreadyMember: boolean }
  | { success: false; error: 'token_expired' | 'max_uses_reached' | 'unknown' }

export async function joinGroupAction(token: string): Promise<JoinGroupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error: rpcError } = await supabase.rpc('accept_group_invite', {
    invite_token: token,
  })

  if (rpcError || !data?.success) {
    const err = data?.error ?? 'unknown'
    return {
      success: false,
      error: err === 'token_expired' || err === 'max_uses_reached' ? err : 'unknown',
    }
  }

  const groupId: string = data.group_id

  if (data.already_member) {
    return { success: true, groupId, alreadyMember: true }
  }

  // Check if this user already has a linked player in the group
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', groupId)
    .eq('linked_user_id', user.id)
    .maybeSingle()

  if (!existingPlayer) {
    // Resolve best display name from profile or auth metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const displayName =
      profile?.full_name?.trim() ||
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      (profile?.email ?? user.email ?? '').split('@')[0]

    const adminClient = createAdminClient()
    await createPlayer(adminClient, groupId, displayName, undefined, user.id)
  }

  return { success: true, groupId, alreadyMember: false }
}

export async function generatePlayerClaimLink(
  playerId: string,
  expiresInHours: number = 48,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  await revokePendingPlayerClaimInvites(supabase, playerId)
  await createPlayerClaimInvite(supabase, playerId, token, user.id, expiresAt)

  return { token }
}

export async function generateGroupInviteLink(
  groupId: string,
  options?: {
    role?: 'manager' | 'member'
    expiresInHours?: number
    maxUses?: number
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = generateToken()
  const expiresAt = options?.expiresInHours
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
    : undefined

  await createGroupInvite(supabase, groupId, token, user.id, {
    role: options?.role,
    expiresAt,
    maxUses: options?.maxUses,
  })

  return { token }
}

export async function generateGameAccessLink(
  gameId: string,
  options?: {
    expiresInHours?: number
    accessLevel?: GameAccessLevel
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = generateToken()
  const expiresAt = options?.expiresInHours
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
    : undefined

  await createGameAccessLink(supabase, gameId, token, user.id, {
    expiresAt,
    accessLevel: options?.accessLevel,
  })

  return { token }
}
