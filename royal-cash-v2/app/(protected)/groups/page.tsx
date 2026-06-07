'use client'

import { useEffect, useState, useCallback } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ChevronForward } from '@/components/ui/chevron'
import { HeaderIconButton, PlusIcon } from '@/components/ui/header-icon-button'
import { EmptyState } from '@/components/ui/empty-state'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { getGroups } from '@/lib/db/groups'
import { createGroupAction } from '@/app/actions/groups'
import type { Group } from '@/lib/domain/types'

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
      <PageHeader
        title={t.groups.myGroups}
        action={
          <HeaderIconButton
            label={t.groups.createGroup}
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon />
          </HeaderIconButton>
        }
      />

      <main className="flex-1 px-4 py-4">
        {groups.length === 0 ? (
          <EmptyState
            message={t.groups.noGroups}
            action={
              <Button onClick={() => setShowCreate(true)}>
                {t.groups.createGroup}
              </Button>
            }
          />
        ) : (
          <div className="rounded-[var(--radius-card)] bg-surface border border-border overflow-hidden divide-y divide-border">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
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
            placeholder="Friday Poker"
            autoFocus
          />
          <Button
            fullWidth
            onClick={handleCreate}
            disabled={!newGroupName.trim() || saving}
          >
            {saving ? t.common.loading : t.groups.createGroup}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

function GroupCard({ group }: { group: Group }) {
  return (
    <a
      href={`/groups/${group.id}`}
      className="flex items-center gap-3 px-4 py-3.5 min-h-[60px]
        active:bg-surface-elevated/80 transition-colors"
    >
      <div className="flex-1 min-w-0 text-right">
        <h3 className="font-medium text-text-primary truncate">{group.name}</h3>
        <p className="text-sm text-text-muted mt-0.5">
          {new Date(group.created_at).toLocaleDateString('he-IL')}
        </p>
      </div>
      <ChevronForward className="text-text-secondary" />
    </a>
  )
}
