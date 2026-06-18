'use client'

import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Loading } from '@/components/ui/loading'
import { ProfileStatCard } from '@/components/profile/profile-stat-card'
import { createClient } from '@/lib/supabase/client'
import { getPersonalStats, type PersonalStats } from '@/lib/db/profile'
import { updateProfileAction } from '@/app/actions/profile'
import { ContactLink } from '@/components/layout/contact-link'

function getSaveErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'שגיאה בשמירה'
}

const symbol = t.currency.ILS

function formatSignedAmount(amount: number): string {
  const abs = Math.abs(amount)
  if (amount > 0) return `+${symbol}${abs}`
  if (amount < 0) return `-${symbol}${abs}`
  return `${symbol}0`
}

function formatWinAmount(amount: number): string {
  if (amount <= 0) return `${symbol}0`
  return `+${symbol}${amount}`
}

// SVG icons — outline style, 40×40
function IconController() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="16" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
      <path d="M5 8l5-3 4 2 5-4" />
      <path d="M17 3l3-1-1 3" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z" />
      <path d="M6 5H3a2 2 0 000 4h3" />
      <path d="M18 5h3a2 2 0 010 4h-3" />
      <path d="M12 16v4" />
      <path d="M8 20h8" />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export default function ProfilePage() {
  const [stats, setStats] = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return
      getPersonalStats(supabase, user.id)
        .then((data) => {
          if (cancelled) return
          setStats(data)
          setPhoneDraft(data.profile.phone ?? '')
          setNameDraft(data.profile.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? '')
        })
        .catch((err) => console.error('Failed to load profile:', err))
        .finally(() => { if (!cancelled) setLoading(false) })
    })
    return () => { cancelled = true }
  }, [])

  async function handleSaveDetails() {
    setSaving(true)
    setSaveError('')
    try {
      const trimmedName = nameDraft.trim() || null
      const trimmedPhone = phoneDraft.trim() || null

      await updateProfileAction({
        full_name: nameDraft.trim(),
        phone: phoneDraft.trim(),
      })

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const fresh = await getPersonalStats(supabase, user.id)
          setStats(fresh)
          setPhoneDraft(fresh.profile.phone ?? '')
          setNameDraft(fresh.profile.full_name ?? '')
        }
      } catch (reloadErr) {
        console.error('Profile saved but stats reload failed:', reloadErr)
        setStats((prev) =>
          prev
            ? {
                ...prev,
                profile: {
                  ...prev.profile,
                  phone: trimmedPhone,
                  full_name: trimmedName ?? '',
                },
              }
            : prev,
        )
      }
      setEditOpen(false)
    } catch (err) {
      setSaveError(getSaveErrorMessage(err))
      console.error('Failed to update profile:', err)
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
  const resolvedName = profile?.full_name || profile?.email?.split('@')[0] || ''
  const gamesPlayed = stats?.gamesPlayed ?? 0
  const totalBalance = stats?.totalBalance ?? 0
  const biggestWin = stats?.biggestWin ?? 0
  const winRate = stats?.winRatePercent ?? 0

  return (
    <>
      <PageHeader title={t.profile.title} />

      <main className="flex-1 px-4 py-3 flex flex-col gap-3">
        {/* Avatar + greeting — compact row */}
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={resolvedName}
              className="w-14 h-14 shrink-0 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 shrink-0 rounded-full border border-border bg-surface-elevated flex items-center justify-center">
              <span className="text-lg font-bold text-accent">
                {(resolvedName || '?').charAt(0)}
              </span>
            </div>
          )}
          {resolvedName && (
            <p className="text-lg font-bold text-text-primary leading-snug">
              {t.profile.greeting}, {resolvedName}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <ProfileStatCard
            icon={<IconController />}
            label={t.groups.gamesPlayed}
            value={String(gamesPlayed)}
            valueClassName="text-accent"
          />
          <ProfileStatCard
            icon={<IconChart />}
            label={t.profile.totalProfitLoss}
            value={formatSignedAmount(totalBalance)}
            valueClassName={totalBalance >= 0 ? 'text-positive' : 'text-negative'}
          />
          <ProfileStatCard
            icon={<IconTarget />}
            label={t.profile.winPercent}
            value={`${winRate}%`}
            valueClassName="text-[#c084fc]"
          />
          <ProfileStatCard
            icon={<IconTrophy />}
            label={t.profile.personalBest}
            value={formatWinAmount(biggestWin)}
            valueClassName="text-[#22d3ee]"
          />
        </div>

        {!stats?.hasLinkedPlayers && (
          <p className="text-xs text-text-muted text-center px-1">
            {t.profile.notLinked}
          </p>
        )}

        {/* Personal details card */}
        <div className="rounded-[var(--radius-card)] bg-surface-elevated border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              type="button"
              onClick={() => {
                setPhoneDraft(profile?.phone ?? '')
                setNameDraft(profile?.full_name ?? '')
                setEditOpen(true)
              }}
              className="flex items-center gap-1 min-h-[40px]"
            >
              <IconEdit />
              <span className="text-sm text-accent">{t.common.edit}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {t.profile.personalDetails}
              </span>
              <IconPerson />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-sm text-text-secondary truncate max-w-[55%]">
              {profile?.full_name || t.profile.noName}
            </p>
            <span className="text-xs text-text-muted shrink-0">{t.profile.fullName}</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm text-text-secondary" dir="ltr">
              {profile?.phone || t.profile.noPhone}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-text-muted">{t.profile.phoneForBit}</span>
              <span className="text-accent font-bold text-sm">₿</span>
            </div>
          </div>
        </div>

        {stats?.hasLinkedPlayers && (
          <section>
            <p className="text-sm font-semibold text-text-primary mb-2">
              {t.profile.gameHistoryTitle}
            </p>
            {!stats.gameHistory?.length ? (
              <p className="text-sm text-text-muted text-center py-4">
                {t.profile.noGameHistory}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.gameHistory.map((entry) => (
                  <li
                    key={`${entry.gameId}-${entry.tableDisplayName}`}
                    className="rounded-[var(--radius-card)] bg-surface-elevated border border-border px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {entry.gameName}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {entry.groupName}
                          {entry.tableDisplayName && (
                            <>
                              {' · '}
                              {t.profile.playedAs} {entry.tableDisplayName}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(entry.gameDate).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-bold shrink-0 ${
                          entry.finalBalance >= 0 ? 'text-positive' : 'text-negative'
                        }`}
                        dir="ltr"
                      >
                        {entry.finalBalance >= 0 ? '+' : ''}
                        {symbol}
                        {Math.abs(entry.finalBalance)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="pt-1">
          <ContactLink variant="row" />
        </section>
      </main>

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t.profile.editDetails}
      >
        <div className="px-4 pb-6 flex flex-col gap-4">
          <Input
            label={t.profile.fullName}
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={t.profile.noName}
          />
          <Input
            label={t.profile.phoneForBit}
            type="tel"
            inputMode="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="0501234567"
            dir="ltr"
          />
          {saveError && (
            <p className="text-sm text-negative text-center">{saveError}</p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" onClick={handleSaveDetails} disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
