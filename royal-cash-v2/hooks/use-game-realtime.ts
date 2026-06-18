'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const REALTIME_TABLES = ['buy_ins', 'expenses', 'game_events', 'game_players'] as const
const DEBOUNCE_MS = 150
// When realtime is healthy, poll only as a slow safety net.
const HEALTHY_POLL_MS = 30_000
// When realtime is not connected (anonymous spectator viewing, transport
// errors, etc.) fall back to a tighter cadence so the UI stays current.
const FALLBACK_POLL_MS = 8_000

export function useGameRealtime(gameId: string | null, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    let realtimeHealthy = false

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        onRefreshRef.current()
      }, DEBOUNCE_MS)
    }

    function startPolling(intervalMs: number) {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          scheduleRefresh()
        }
      }, intervalMs)
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
        if (status === 'SUBSCRIBED') {
          realtimeHealthy = true
          startPolling(HEALTHY_POLL_MS)
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          if (status !== 'CLOSED') {
            console.error('Game realtime subscription failed:', status, err)
          }
          if (realtimeHealthy) {
            realtimeHealthy = false
            startPolling(FALLBACK_POLL_MS)
          }
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

    // Start in fallback cadence; once the channel reports SUBSCRIBED we
    // switch to the healthy (slow) cadence.
    startPolling(FALLBACK_POLL_MS)

    return () => {
      cancelled = true
      authSubscription.unsubscribe()
      if (debounceTimer) clearTimeout(debounceTimer)
      if (pollTimer) clearInterval(pollTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [gameId])
}
