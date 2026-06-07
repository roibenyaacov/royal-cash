'use client'

import { useCallback, useEffect, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Loading } from '@/components/ui/loading'
import { ProfileStatCard } from '@/components/profile/profile-stat-card'
import { updateProfilePhoneAction } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/client'
import { getPersonalStats, type PersonalStats } from '@/lib/db/profile'

const symbol = t.currency.ILS

function formatSignedAmount(amount: number): string {
  const abs = Math.abs(amount)
  if (amount > 0) return `${symbol}${abs}+`
  if (amount < 0) return `${symbol}${abs}`
  return `${symbol}0`
}

function formatWinAmount(amount: number): string {
  if (amount <= 0) return `${symbol}0`
  return `${symbol}${amount}+`
}

export default function ProfilePage() {
  const [stats, setStats] = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    try {
      const data = await getPersonalStats(supabase, user.id)
      setStats(data)
      setPhoneDraft(data.profile.phone ?? '')
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function handleSavePhone() {
    setSaving(true)
    try {
      await updateProfilePhoneAction(phoneDraft)
      setStats((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, phone: phoneDraft.trim() || null },
            }
          : prev,
      )
      setEditOpen(false)
    } catch (err) {
      console.error('Failed to update phone:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t.profile.title} />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  const profile = stats?.profile
  const gamesPlayed = stats?.gamesPlayed ?? 0
  const totalBalance = stats?.totalBalance ?? 0
  const biggestWin = stats?.biggestWin ?? 0
  const winRate = stats?.winRatePercent ?? 0

  return (
    <>
      <PageHeader title={t.profile.title} />

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        <Card elevated>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-accent">
              {t.profile.personalDetails}
            </h2>
            <button
              type="button"
              onClick={() => {
                setPhoneDraft(profile?.phone ?? '')
                setEditOpen(true)
              }}
              className="flex items-center gap-1 text-sm text-text-secondary min-h-[44px] px-1"
            >
              <span aria-hidden>✏️</span>
              {t.common.edit}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0" aria-hidden>
                📱
              </span>
              <p className="text-sm text-text-secondary">{t.profile.phoneForBit}</p>
            </div>
            <p
              className="text-lg font-semibold text-text-primary shrink-0"
              dir="ltr"
            >
              {profile?.phone || t.profile.noPhone}
            </p>
          </div>
        </Card>

        {!stats?.hasLinkedPlayers && (
          <p className="text-sm text-text-muted text-center px-2">
            {t.profile.notLinked}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <ProfileStatCard
            icon="🎮"
            label={t.groups.gamesPlayed}
            value={String(gamesPlayed)}
            valueClassName="text-accent"
          />
          <ProfileStatCard
            icon="📈"
            label={t.profile.totalProfitLoss}
            value={formatSignedAmount(totalBalance)}
            valueClassName={
              totalBalance >= 0 ? 'text-positive' : 'text-negative'
            }
          />
          <ProfileStatCard
            icon="🏆"
            label={t.profile.personalBest}
            value={formatWinAmount(biggestWin)}
            valueClassName="text-positive"
            large
          />
          <ProfileStatCard
            icon="🎯"
            label={t.profile.winPercent}
            value={`${winRate}%`}
            valueClassName="text-[#c084fc]"
            large
          />
        </div>
      </main>

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t.profile.editPhone}
      >
        <div className="px-4 pb-6 flex flex-col gap-4">
          <Input
            label={t.profile.phoneForBit}
            type="tel"
            inputMode="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="0501234567"
            dir="ltr"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSavePhone}
              disabled={saving}
            >
              {saving ? t.common.loading : t.common.save}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
