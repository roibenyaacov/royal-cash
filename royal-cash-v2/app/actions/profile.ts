'use server'

import { createClient } from '@/lib/supabase/server'
import { updateProfile, updateProfilePhone } from '@/lib/db/profile'

export async function updateProfileAction(fields: {
  full_name?: string
  phone?: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updates: { full_name?: string | null; phone?: string | null } = {}
  if (fields.full_name !== undefined) updates.full_name = fields.full_name.trim() || null
  if (fields.phone !== undefined) updates.phone = fields.phone.trim() || null

  await updateProfile(supabase, user.id, updates)
}

export async function updateProfilePhoneAction(phone: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await updateProfilePhone(supabase, user.id, phone.trim() || null)
}
