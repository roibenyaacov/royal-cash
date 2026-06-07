'use server'

import { createClient } from '@/lib/supabase/server'
import { updateProfilePhone } from '@/lib/db/profile'

export async function updateProfilePhoneAction(phone: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmed = phone.trim()
  await updateProfilePhone(supabase, user.id, trimmed || null)
}
