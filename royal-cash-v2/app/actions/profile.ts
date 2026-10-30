'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertProfileFields } from '@/lib/db/profile'

export async function updateProfileAction(fields: {
  full_name?: string
  phone?: string
}): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updates: { full_name?: string | null; phone?: string | null } = {}
  if (fields.full_name !== undefined) {
    updates.full_name = fields.full_name.trim() || null
  }
  if (fields.phone !== undefined) {
    updates.phone = fields.phone.trim() || null
  }

  await upsertProfileFields(supabase, user.id, updates, user)
  revalidatePath('/profile')
}

/**
 * Point the caller's photo at a file they uploaded, or clear it with null.
 *
 * The RPC is what actually writes it: it checks the URL really is one of
 * our own storage objects and fans the value out to every player row the
 * caller is linked to, so the photo appears at every table at once rather
 * than only the group that happened to be open.
 */
export async function setMyAvatarAction(url: string | null): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('set_my_avatar', { p_url: url })

  if (error) {
    // Migration 033 not applied yet — say so instead of failing silently.
    if (error.code === 'PGRST202' || error.message?.includes('set_my_avatar')) {
      throw new Error('avatar_needs_migration')
    }
    throw new Error(error.message)
  }

  const payload = data as { success?: boolean; error?: string } | null
  if (payload?.error) throw new Error(payload.error)
  if (!payload?.success) throw new Error('avatar_failed')

  revalidatePath('/profile')
  revalidatePath('/groups')
}

/**
 * Start the caller's personal count over.
 *
 * Nothing is deleted: the profile gets a reset mark and every personal
 * aggregate from then on only counts games finalized after it. The group's
 * history and every other player's numbers are untouched, and clearing the
 * mark in the database restores the full history.
 */
export async function resetMyStatsAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('reset_my_stats')

  if (error) {
    // Migration 028 not applied yet — say so instead of failing silently.
    if (
      error.code === 'PGRST202' ||
      error.message?.includes('reset_my_stats')
    ) {
      throw new Error('reset_needs_migration')
    }
    throw new Error(error.message)
  }

  const payload = data as { success?: boolean; error?: string } | null
  if (payload?.error) throw new Error(payload.error)
  if (!payload?.success) throw new Error('reset_failed')

  revalidatePath('/profile')
  revalidatePath('/stats')
  revalidatePath('/groups')
}

/**
 * Put back a personal count that was reset.
 *
 * The reset only ever stamped the profile, so the games, results and
 * settlements behind it were never touched — this clears the stamp and
 * rebuilds the aggregates from the full finalized history.
 */
export async function undoMyStatsResetAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('undo_my_stats_reset')

  if (error) {
    // Migration 032 not applied yet — say so instead of failing silently.
    if (
      error.code === 'PGRST202' ||
      error.message?.includes('undo_my_stats_reset')
    ) {
      throw new Error('undo_reset_needs_migration')
    }
    throw new Error(error.message)
  }

  const payload = data as { success?: boolean; error?: string } | null
  if (payload?.error) throw new Error(payload.error)
  if (!payload?.success) throw new Error('undo_reset_failed')

  revalidatePath('/profile')
  revalidatePath('/stats')
  revalidatePath('/groups')
}
