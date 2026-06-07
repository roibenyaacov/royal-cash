'use client'

import { useMemo } from 'react'
import { t } from '@/lib/i18n/dictionary'
import { Card } from '@/components/ui/card'
import { IosListGroup, IosListRow } from '@/components/ui/ios-list'
import { GameActivityLog } from '@/components/games/game-activity-log'
import type { GameViewSnapshot } from '@/lib/db/game-view'
import type { Currency } from '@/lib/domain/types'

type GameSpectatorViewProps = {
  snapshot: GameViewSnapshot
  readOnlyLabel?: string
}

export function GameSpectatorView({ snapshot, readOnlyLabel }: GameSpectatorViewProps) {
  const { game, players, expenses, events, results, settlements } = snapshot
  const currency = game.currency as Currency
  const symbol = t.currency[currency]

  const playerNames = useMemo(
    () => new Map(players.map((p) => [p.id, p.display_name])),
    [players],
  )

  const totalBuyIns = players.reduce((s, p) => s + p.total_buy_ins, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <main className="flex-1 px-4 py-4 flex flex-col gap-4 pb-6">
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard label={t.game.totalBuyIns} value={`${symbol}${totalBuyIns}`} />
        <SummaryCard label={t.game.playersCount} value={String(players.length)} />
        <SummaryCard label={t.game.expensesTotal} value={`${symbol}${totalExpenses}`} />
      </div>

      {readOnlyLabel && (
        <p className="text-xs text-text-muted text-center">{readOnlyLabel}</p>
      )}

      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          {t.players.players}
        </h2>
        <IosListGroup>
          {players.map((player) => (
            <IosListRow key={player.id} showChevron={false}>
              <div className="flex items-center justify-between gap-3 w-full">
                <span className="font-medium text-text-primary truncate">
                  {player.display_name}
                </span>
                <span className="text-sm text-text-secondary shrink-0" dir="ltr">
                  {symbol}{player.total_buy_ins}
                </span>
              </div>
            </IosListRow>
          ))}
        </IosListGroup>
      </section>

      {expenses.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.expenses.expenseHistory}
          </h2>
          <div className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {expense.description || t.expenses.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t.expenses.whoPaid} {expense.paid_by_name}
                    </p>
                  </div>
                  <span className="font-semibold text-text-primary shrink-0" dir="ltr">
                    {symbol}{expense.amount}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <GameActivityLog events={events} playerNames={playerNames} currency={currency} />

      {results.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.results.title}
          </h2>
          <IosListGroup>
            {results.map((row) => (
              <IosListRow key={row.player_id} showChevron={false}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="font-medium text-text-primary truncate">
                    {row.player_name}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      row.final_balance >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                    dir="ltr"
                  >
                    {row.final_balance >= 0 ? '+' : ''}
                    {symbol}{Math.abs(row.final_balance)}
                  </span>
                </div>
              </IosListRow>
            ))}
          </IosListGroup>
        </section>
      )}

      {settlements.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3">
            {t.results.settlements}
          </h2>
          <IosListGroup>
            {settlements.map((s, i) => (
              <IosListRow key={`${s.from_player_name}-${s.to_player_name}-${i}`} showChevron={false}>
                <span className="text-sm text-text-primary">
                  {s.from_player_name}{' '}
                  <span className="text-text-muted">{t.results.paysTo}</span>{' '}
                  {s.to_player_name}
                  <span className="font-semibold text-accent ms-1" dir="ltr">
                    {symbol}{s.amount}
                  </span>
                </span>
              </IosListRow>
            ))}
          </IosListGroup>
        </section>
      )}
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text-primary" dir="ltr">
        {value}
      </p>
    </Card>
  )
}
