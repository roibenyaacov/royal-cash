'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseAnonKey, hasSupabasePublicConfig } from '@/lib/supabase/config'
import { getAuthCallbackUrl } from '@/lib/site-url'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabasePublicConfig()) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async (nextPath?: string) => {
    if (!hasSupabasePublicConfig()) {
      throw new Error('Missing Supabase public configuration')
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthCallbackUrl(nextPath),
        // Kong gateway requires apikey even for browser-initiated OAuth flows.
        // The anon key is already public (NEXT_PUBLIC_*) so this is safe.
        queryParams: { apikey: getSupabaseAnonKey() },
      },
    })

    if (error) throw error
    if (data.url) window.location.assign(data.url)
  }

  const signOut = async () => {
    if (!hasSupabasePublicConfig()) return

    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return { user, loading, signInWithGoogle, signOut }
}
