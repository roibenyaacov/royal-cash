'use client'

import { useCallback, useEffect, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/layout/page-header'
import { GameSpectatorView } from '@/components/games/game-spectator-view'
import { createClient } from '@/lib/supabase/client'
import { getGameViewByAccessToken } from '@/lib/db/game-view'
import { useGameRealtime } from '@/hooks/use-game-realtime'
import type { GameViewSnapshot } from '@/lib/db/game-view'

type AccessState = 'loading' | 'valid' | 'error'

export default function GameAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState('')
  const [state, setState] = useState<AccessState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [snapshot, setSnapshot] = useState<GameViewSnapshot | null>(null)

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  const loadSnapshot = useCallback(async () => {
    if (!token) return
    const supabase = createClient()
    try {
      const result = await getGameViewByAccessToken(supabase, token)
      if ('error' in result) {
        setState('error')
        if (result.error === 'token_expired') setErrorMsg(t.invites.expiredLink)
        else setErrorMsg(t.invites.invalidLink)
        setSnapshot(null)
        return
      }
      setSnapshot(result)
      setState('valid')
    } catch {
      setState('error')
      setErrorMsg(t.invites.invalidLink)
      setSnapshot(null)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    // State changes happen inside the async loadSnapshot, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSnapshot()
  }, [token, loadSnapshot])

  useGameRealtime(
    snapshot?.game.status === 'active' ? snapshot.game_id : null,
    loadSnapshot,
  )

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg">
        <Loading />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col min-h-dvh bg-bg">
        <PageHeader title={t.invites.viewGame} />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-negative text-center">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (!snapshot) return null

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <PageHeader title={snapshot.game.name} />
      <GameSpectatorView
        snapshot={snapshot}
        readOnlyLabel={t.invites.viewGameReadOnly}
      />
    </div>
  )
}
