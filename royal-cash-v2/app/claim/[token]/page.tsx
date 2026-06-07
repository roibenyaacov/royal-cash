'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

type ClaimState = 'loading' | 'ready' | 'claiming' | 'success' | 'error'

export default function ClaimPlayerPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [state, setState] = useState<ClaimState>('loading')
  const [playerName, setPlayerName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [groupId, setGroupId] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return

    async function checkToken() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('player_claim_invites')
          .select('*, players(display_name)')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        if (!data) {
          setState('error')
          setErrorMsg(t.invites.invalidLink)
          return
        }
        const player = data.players as unknown as { display_name: string } | null
        setPlayerName(player?.display_name ?? '')
        setState('ready')
      } catch {
        setState('ready')
      }
    }
    checkToken()
  }, [token])

  const handleClaim = async () => {
    if (!user) {
      signInWithGoogle()
      return
    }

    setState('claiming')
    const supabase = createClient()
    const { data } = await supabase.rpc('claim_player', { claim_token: token })

    if (data?.error) {
      setState('error')
      if (data.error === 'token_expired') setErrorMsg(t.invites.expiredLink)
      else if (data.error === 'player_already_linked') setErrorMsg(t.invites.playerAlreadyLinked)
      else setErrorMsg(t.invites.invalidLink)
      return
    }

    if (data?.success) {
      setState('success')
      setGroupId(data.group_id)
    }
  }

  if (authLoading || state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg">
        <Loading />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="w-full max-w-sm">
        <Card>
          <div className="flex flex-col items-center gap-4 py-4">
            <h1 className="text-2xl font-bold text-accent">{t.app.name}</h1>

            {state === 'error' && (
              <>
                <p className="text-negative text-center">{errorMsg}</p>
                <Button variant="secondary" onClick={() => router.push('/login')}>
                  {t.common.back}
                </Button>
              </>
            )}

            {state === 'ready' && (
              <>
                <h2 className="text-lg font-semibold text-text-primary">
                  {t.invites.claimPlayer}
                </h2>
                {playerName && (
                  <p className="text-xl font-bold text-text-primary">{playerName}</p>
                )}
                <p className="text-sm text-text-secondary text-center">
                  {t.invites.claimDescription}
                </p>
                <Button fullWidth size="lg" onClick={handleClaim}>
                  {user ? t.invites.claimButton : t.auth.loginWithGoogle}
                </Button>
              </>
            )}

            {state === 'claiming' && <Loading />}

            {state === 'success' && (
              <>
                <p className="text-positive font-semibold text-center">
                  {t.invites.claimSuccess}
                </p>
                <Button fullWidth onClick={() => router.push(`/groups/${groupId}`)}>
                  {t.common.back}
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
