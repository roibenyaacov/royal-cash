import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureAuthorizeApiKey } from '@/lib/supabase/config'

export async function startGoogleOAuth(
  supabase: SupabaseClient,
  redirectTo: string,
): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error('No OAuth URL returned from Supabase')

  window.location.assign(ensureAuthorizeApiKey(data.url))
}
