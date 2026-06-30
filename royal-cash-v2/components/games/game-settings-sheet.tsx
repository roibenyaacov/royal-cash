'use client'

import { useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import type { Player } from '@/lib/domain/types'

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  managerPlayerIds: string[]
  onSave: (managerPlayerIds: string[]) => void
}

export function GameSettingsSheet({ open, onClose, ...rest }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t.game.gameSettings}>
      {/* BottomSheet unmounts children when closed, so this content remounts on
          each open and re-seeds from the current managers — no effects. */}
      {open && <SettingsContent onClose={onClose} {...rest} />}
    </BottomSheet>
  )
}

type ContentProps = Omit<Props, 'open'>

function SettingsContent({
  onClose,
  players,
  managerPlayerIds,
  onSave,
}: ContentProps) {
  const [restrict, setRestrict] = useState(managerPlayerIds.length > 0)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(managerPlayerIds),
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chosen = players.filter((p) => selected.has(p.id)).map((p) => p.id)
  const canSave = !restrict || chosen.length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave(restrict ? chosen : [])
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm text-text-secondary mb-2">
          {t.game.managersQuestion}
        </h3>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setRestrict(false)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              !restrict ? 'bg-accent/15 text-accent' : 'bg-surface text-text-muted'
            }`}
          >
            {t.game.managersEveryone}
          </button>
          <button
            type="button"
            onClick={() => setRestrict(true)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              restrict ? 'bg-accent/15 text-accent' : 'bg-surface text-text-muted'
            }`}
          >
            {t.game.managersSome}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1.5">{t.game.managersHint}</p>
      </div>

      {restrict && (
        <div>
          <p className="text-xs text-text-secondary mb-2">
            {t.game.selectManagers}
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const isManager = selected.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors border min-h-[40px] ${
                    isManager
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-surface-elevated border-border text-text-secondary'
                  }`}
                >
                  {p.display_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button fullWidth onClick={handleSave} disabled={!canSave}>
          {t.common.save}
        </Button>
      </div>
    </div>
  )
}
