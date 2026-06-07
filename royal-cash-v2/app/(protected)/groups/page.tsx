'use client'

import { useEffect, useState, useCallback } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { getGroups } from '@/lib/db/groups'
import { createGroupAction } from '@/app/actions/groups'
import type { Group } from '@/lib/domain/types'

function GroupAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || '?'
  return (
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-surface border border-accent/25">
      <span className="text-accent font-bold text-lg leading-none">{initial}</span>
    </div>
  )
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchGroups = useCallback(async () => {
    const supabase = createClient()
    try {
      const data = await getGroups(supabase)
      setGroups(data)
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleCreate = async () => {
    if (!newGroupName.trim() || saving) return
    setSaving(true)
    try {
      const group = await createGroupAction(newGroupName.trim())
      setGroups((prev) => [group, ...prev])
      setNewGroupName('')
      setShowCreate(false)
    } catch (err) {
      console.error('Failed to create group:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t.groups.myGroups} />
        <div className="flex-1 flex items-center justify-center">
          <Loading />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t.groups.myGroups} />

      <main className="flex-1 px-4 py-4 flex flex-col gap-3">
        {groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <p className="text-text-muted text-sm text-center">{t.groups.noGroups}</p>
            <Button onClick={() => setShowCreate(true)}>
              {t.groups.createGroup}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <a key={group.id} href={`/groups/${group.id}`}>
                  {/* In RTL flex: DOM-first = visual RIGHT */}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-elevated border border-border active:bg-surface transition-colors">
                    {/* Avatar — RIGHT in RTL (first in DOM) */}
                    <GroupAvatar name={group.name} />

                    {/* Name — middle */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate text-base">
                        {group.name}
                      </p>
                    </div>

                    {/* Chevron — LEFT in RTL (last in DOM) */}
                    <svg
                      viewBox="0 0 8 13"
                      fill="none"
                      className="w-[7px] h-[11px] shrink-0 opacity-35 text-text-secondary"
                      aria-hidden
                    >
                      <path
                        d="M7 1L1 6.5L7 12"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </div>

            {/* Create new group */}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full py-4 rounded-2xl font-bold text-base text-black mt-1 active:opacity-85 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%)' }}
            >
              {t.groups.createGroup}
            </button>
          </>
        )}
      </main>

      <BottomSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t.groups.createGroup}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t.groups.groupName}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Friday Night Poker"
            autoFocus
          />
          <Button fullWidth onClick={handleCreate} disabled={!newGroupName.trim() || saving}>
            {saving ? t.common.loading : t.groups.createGroup}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
