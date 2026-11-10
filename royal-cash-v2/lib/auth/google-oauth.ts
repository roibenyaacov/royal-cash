import type { SupabaseClient } from '@supabase/supabase-js'
import { startOAuth } from '@/lib/auth/oauth'

/** Kept as a named entry point; the mechanics live in `startOAuth`. */
export async function startGoogleOAuth(
  supabase: SupabaseClient,
  nextPath?: string,
): Promise<void> {
  return startOAuth(supabase, 'google', nextPath)
}
