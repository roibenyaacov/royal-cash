'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const REALTIME_TABLES = ['buy_ins', 'expenses', 'game_events', 'game_players'] as const
const DEBOUNCE_MS = 150
const POLL_MS = 5000

export function useGameRealtime(gameId: string | null, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        onRefreshRef.current()
      }, DEBOUNCE_MS)
    }

    async function bindRealtimeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }
    }

    async function subscribe() {
      await bindRealtimeAuth()
      if (cancelled) return

      let nextChannel = supabase.channel(`game:${gameId}`)

      for (const table of REALTIME_TABLES) {
        nextChannel = nextChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `game_id=eq.${gameId}`,
          },
          scheduleRefresh,
        )
      }

      nextChannel.subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Game realtime subscription failed:', status, err)
        }
      })

      channel = nextChannel
    }

    void subscribe()

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token)
      }
    })

    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }, POLL_MS)

    return () => {
      cancelled = true
      authSubscription.unsubscribe()
      if (debounceTimer) clearTimeout(debounceTimer)
      if (pollTimer) clearInterval(pollTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [gameId])
}
