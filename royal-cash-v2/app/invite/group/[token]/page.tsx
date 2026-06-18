'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { t } from '@/lib/i18n/dictionary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { useAuth } from '@/hooks/use-auth'
import {
  consumeGroupInviteAfterAuth,
  markGroupInviteAfterAuth,
  shouldResumeAfterAuth,
} from '@/lib/auth/redirect-flags'
import { joinGroupAction } from '@/app/actions/invites'

type InviteState = 'loading' | 'ready' | 'joining' | 'success' | 'error'

export default function GroupInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [state, setState] = useState<InviteState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [groupId, setGroupId] = useState('')
  const [token, setToken] = useState('')
  const autoJoinAttempted = useRef(false)

  useEffect(() => {
    params.then((p) => {
      setToken(p.token)
      setState('ready')
    })
  }, [params])

  const performJoin = useCallback(async () => {
    if (!token) return

    setState('joining')
    const result = await joinGroupAction(token)

    if (!result.success) {
      setState('error')
      if (result.error === 'token_expired') setErrorMsg(t.invites.expiredLink)
      else setErrorMsg(t.invites.invalidLink)
      return
    }

    setState('success')
    setGroupId(result.groupId)

    if (result.alreadyMember) {
      router.push(`/groups/${result.groupId}`)
    }
  }, [token, router])

  useEffect(() => {
    if (state !== 'ready' || !user || !token || autoJoinAttempted.current) return
    if (
      !shouldResumeAfterAuth(
        token,
        searchParams.get('resume'),
        consumeGroupInviteAfterAuth,
      )
    ) {
      return
    }

    autoJoinAttempted.current = true
    if (searchParams.get('resume') === '1') {
      router.replace(`/invite/group/${token}`)
    }
    // Auto-join after returning from Google sign-in. State changes happen
    // inside the async callback, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void performJoin()
  }, [user, state, token, performJoin, searchParams, router])

  const handleJoin = async () => {
    if (!user) {
      markGroupInviteAfterAuth(token)
      await signInWithGoogle(`/invite/group/${token}`)
      return
    }

    await performJoin()
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
                  {t.invites.joinGroup}
                </h2>
                <p className="text-sm text-text-secondary text-center">
                  {t.invites.joinDescription}
                </p>
                <Button fullWidth size="lg" onClick={handleJoin}>
                  {user ? t.invites.joinButton : t.auth.loginWithGoogle}
                </Button>
              </>
            )}

            {state === 'joining' && <Loading />}

            {state === 'success' && (
              <>
                <p className="text-positive font-semibold text-center">
                  {t.invites.joinSuccess}
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
