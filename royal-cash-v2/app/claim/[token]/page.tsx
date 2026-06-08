'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { useAuth } from '@/hooks/use-auth'
import {
  consumeClaimAfterAuth,
  markClaimAfterAuth,
  shouldResumeAfterAuth,
} from '@/lib/auth/redirect-flags'
import { createClient } from '@/lib/supabase/client'
import { startGoogleOAuth } from '@/lib/auth/google-oauth'
import { getAuthCallbackUrl } from '@/lib/site-url'

type ClaimState = 'loading' | 'ready' | 'claiming' | 'success' | 'error'

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? vars[key] : `{${key}}`,
  )
}

export default function ClaimPlayerPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<ClaimState>('loading')
  const [playerName, setPlayerName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [groupId, setGroupId] = useState('')
  const [token, setToken] = useState('')
  const autoClaimAttempted = useRef(false)

  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

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

      if (data.error === 'player_already_linked') {
        setState('error')
        setErrorMsg(t.invites.playerAlreadyLinked)
        return
      }

      if (data.error === 'user_already_linked_in_group') {
        setState('error')
        setErrorMsg(t.invites.userAlreadyLinkedInGroup)
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

  const executeClaim = useCallback(async () => {
    if (!token) return

    setState('claiming')
    const supabase = createClient()
    const { data } = await supabase.rpc('claim_player', { claim_token: token })

    if (data?.error) {
      setState('error')
      if (data.error === 'token_expired') setErrorMsg(t.invites.expiredLink)
      else if (data.error === 'player_already_linked') setErrorMsg(t.invites.playerAlreadyLinked)
      else if (data.error === 'user_already_linked_in_group') {
        setErrorMsg(t.invites.userAlreadyLinkedInGroup)
      } else if (data.error === 'not_authenticated') setErrorMsg(t.invites.invalidLink)
      else setErrorMsg(t.invites.invalidLink)
      return
    }

    if (data?.success) {
      setState('success')
      setGroupId(data.group_id)
    }
  }, [token])

  useEffect(() => {
    if (state !== 'ready' || !user || !token || autoClaimAttempted.current) return
    if (
      !shouldResumeAfterAuth(
        token,
        searchParams.get('resume'),
        consumeClaimAfterAuth,
      )
    ) {
      return
    }

    autoClaimAttempted.current = true
    if (searchParams.get('resume') === '1') {
      router.replace(`/claim/${token}`)
    }
    void executeClaim()
  }, [user, state, token, executeClaim, searchParams, router])

  async function handleClaim() {
    if (!user) {
      markClaimAfterAuth(token)
      const supabase = createClient()
      await startGoogleOAuth(supabase, getAuthCallbackUrl(`/claim/${token}`))
      return
    }

    await executeClaim()
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
                  {user
                    ? fill(t.invites.claimConfirm, { name: playerName })
                    : t.invites.claimDescription}
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
