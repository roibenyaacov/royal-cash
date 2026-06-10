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
