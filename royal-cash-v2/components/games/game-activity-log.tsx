'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { t } from '@/lib/i18n/dictionary'
import type { GameEvent, GameEventType, Currency } from '@/lib/domain/types'

type GameActivityLogProps = {
  events: GameEvent[]
  playerNames: Map<string, string>
  currency: Currency
}

type GroupedEvent = {
  id: string
  player_id: string | null
  event_type: GameEventType
  unitAmount: number
  totalAmount: number
  count: number
  description: string | null
  created_at: string
}

export function GameActivityLog({
  events,
  playerNames,
  currency,
}: GameActivityLogProps) {
  const symbol = t.currency[currency]
  const grouped = useMemo(() => groupConsecutiveEvents(events), [events])

  if (grouped.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          {t.game.activityLog}
        </h2>
        <p className="text-sm text-text-muted">{t.game.noActivity}</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary mb-3">
        {t.game.activityLog}
      </h2>
      <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
        {grouped.map((entry) => (
          <Card key={entry.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-text-primary">
                  {formatGroupedText(entry, playerNames, symbol)}
                </p>
                {entry.count === 1 &&
                  entry.description &&
                  entry.event_type !== 'expense_added' && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {entry.description}
                    </p>
                  )}
              </div>
              <time
                className="text-xs text-text-muted shrink-0"
                dateTime={entry.created_at}
              >
                {formatTime(entry.created_at)}
              </time>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function groupConsecutiveEvents(events: GameEvent[]): GroupedEvent[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const groups: GroupedEvent[] = []

  for (const event of sorted) {
    const last = groups[groups.length - 1]

    if (last && canGroup(last, event)) {
      last.count += 1
      last.totalAmount += event.amount ?? 0
      last.created_at = event.created_at
      last.id = event.id
    } else {
      groups.push({
        id: event.id,
        player_id: event.player_id,
        event_type: event.event_type,
        unitAmount: event.amount ?? 0,
        totalAmount: event.amount ?? 0,
        count: 1,
        description: event.description,
        created_at: event.created_at,
      })
    }
  }

  return groups.reverse()
}

function canGroup(last: GroupedEvent, event: GameEvent): boolean {
  if (event.event_type === 'expense_added') return false
  if (event.event_type !== last.event_type) return false
  if (event.player_id !== last.player_id) return false
  if ((event.amount ?? 0) !== last.unitAmount) return false
  return true
}

function formatGroupedText(
  entry: GroupedEvent,
  playerNames: Map<string, string>,
  symbol: string,
): string {
  const playerName = entry.player_id
    ? playerNames.get(entry.player_id) ?? t.game.unknownPlayer
    : ''

  const amount = entry.count > 1 ? entry.totalAmount : entry.unitAmount

  switch (entry.event_type) {
    case 'buy_in_added':
      return `${playerName} — ${t.game.eventBuyInAdded} ${symbol}${amount}`
    case 'buy_in_removed':
      return `${playerName} — ${t.game.eventBuyInRemoved} ${symbol}${amount}`
    case 'expense_added':
      return `${playerName} — ${t.game.eventExpenseAdded} ${symbol}${amount}${entry.description ? `: ${entry.description}` : ''}`
    default:
      return ''
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
