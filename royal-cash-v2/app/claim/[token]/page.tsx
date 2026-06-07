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
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<ClaimState>('loading')
  const [playerName, setPlayerName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [groupId, setGroupId] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  // Validate token via SECURITY DEFINER RPC — works for anon + authenticated
  useEffect(() => {
    if (!token) return

    async function checkToken() {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_claim_invite_info', {
        claim_token: token,
      })

      if (error || !data) {
        setState('error')
        setErrorMsg(t.invites.invalidLink)
        return
      }

      if (data.error === 'token_expired') {
        setState('error')
        setErrorMsg(t.invites.expiredLink)
        return
      }

      if (data.error) {
        setState('error')
        setErrorMsg(t.invites.invalidLink)
        return
      }

      setPlayerName(data.player_name ?? '')
      setState('ready')
    }

    checkToken()
  }, [token])

  // After a successful OAuth redirect back to /claim/[token], auto-claim
  useEffect(() => {
    if (state !== 'ready' || !user || !token) return

    // Check if we just returned from OAuth (user was null, now is set)
    // Auto-trigger the claim so the user doesn't have to tap again
    handleClaim()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state, token])

  async function handleClaim() {
    if (!user) {
      // Preserve the claim token in the OAuth return URL
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/claim/${token}`)}`,
        },
      })
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
                <Button variant="secondary" onClick={() => router.push('/groups')}>
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

            {state === 'claiming' && (
              <>
                <Loading />
                <p className="text-sm text-text-muted">{t.invites.claimButton}...</p>
              </>
            )}

            {state === 'success' && (
              <>
                <p className="text-positive font-semibold text-center text-lg">
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
