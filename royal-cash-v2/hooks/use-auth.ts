'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasSupabasePublicConfig } from '@/lib/supabase/config'
import { startGoogleOAuth } from '@/lib/auth/google-oauth'
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
    await startGoogleOAuth(supabase, getAuthCallbackUrl(nextPath))
  }

  const signOut = async () => {
    if (!hasSupabasePublicConfig()) return

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { user, loading, signInWithGoogle, signOut }
}
