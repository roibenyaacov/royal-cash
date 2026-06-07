'use server'

import { createClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/utils/tokens'
import {
  createPlayerClaimInvite,
  createGroupInvite,
  createGameAccessLink,
} from '@/lib/db/invites'
import type { GameAccessLevel } from '@/lib/domain/types'

export async function generatePlayerClaimLink(
  playerId: string,
  expiresInHours: number = 48,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

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
