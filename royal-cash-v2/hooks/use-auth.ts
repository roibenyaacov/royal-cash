'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasSupabasePublicConfig } from '@/lib/supabase/config'
import { startOAuth } from '@/lib/auth/oauth'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // Start out as "loading" only when we actually have Supabase configured;
  // otherwise there is no async user lookup to wait on.
  const [loading, setLoading] = useState(() => hasSupabasePublicConfig())

  useEffect(() => {
    if (!hasSupabasePublicConfig()) return

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
    await startOAuth(supabase, 'google', nextPath)
  }

  // Required alongside Google by App Store review guideline 4.8.
  const signInWithApple = async (nextPath?: string) => {
    if (!hasSupabasePublicConfig()) {
      throw new Error('Missing Supabase public configuration')
    }

    const supabase = createClient()
    await startOAuth(supabase, 'apple', nextPath)
  }

  const signOut = async () => {
    if (!hasSupabasePublicConfig()) return

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { user, loading, signInWithGoogle, signInWithApple, signOut }
}
