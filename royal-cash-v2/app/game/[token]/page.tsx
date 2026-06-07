'use client'

import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/client'

type AccessState = 'loading' | 'valid' | 'error'

type GameData = {
  id: string
  name: string
  date: string
  status: string
  currency: string
  default_buy_in: number
}

export default function GameAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [state, setState] = useState<AccessState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [game, setGame] = useState<GameData | null>(null)

  useEffect(() => {
    params.then(async (p) => {
      const supabase = createClient()
      const { data } = await supabase.rpc('validate_game_access', {
        access_token: p.token,
      })

      if (data?.error) {
        setState('error')
        if (data.error === 'token_expired') setErrorMsg(t.invites.expiredLink)
        else setErrorMsg(t.invites.invalidLink)
        return
      }

      if (data?.success && data.game_id) {
        const { data: gameData } = await supabase
          .from('games')
          .select('id, name, date, status, currency, default_buy_in')
          .eq('id', data.game_id)
          .single()

        if (gameData) {
          setGame(gameData)
          setState('valid')
        } else {
          setState('error')
          setErrorMsg(t.invites.invalidLink)
        }
      }
    })
  }, [params])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg">
        <Loading />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg px-6">
        <Card>
          <div className="flex flex-col items-center gap-4 py-4">
            <h1 className="text-2xl font-bold text-accent">{t.app.name}</h1>
            <p className="text-negative text-center">{errorMsg}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!game) return null

  const symbol = t.currency[game.currency as keyof typeof t.currency] ?? '₪'

  return (
    <div className="min-h-dvh bg-bg">
      <PageHeader title={`${t.invites.viewGame}: ${game.name}`} />
      <main className="px-4 py-4 flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">תאריך</span>
              <span className="text-text-primary">{game.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t.game.defaultBuyIn}</span>
              <span className="text-text-primary" dir="ltr">
                {symbol}{game.default_buy_in}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">סטטוס</span>
              <span
                className={`text-sm px-2 py-0.5 rounded-full ${
                  game.status === 'active'
                    ? 'bg-positive/10 text-positive'
                    : 'bg-border text-text-muted'
                }`}
              >
                {game.status === 'active' ? 'פעיל' : 'סגור'}
              </span>
            </div>
          </div>
        </Card>

        <p className="text-xs text-text-muted text-center">
          {t.invites.viewGame} -- read-only
        </p>
      </main>
    </div>
  )
}
