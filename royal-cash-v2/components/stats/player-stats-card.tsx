import { t } from '@/lib/i18n/dictionary'
import { Card } from '@/components/ui/card'
import type { Currency } from '@/lib/domain/types'

export type PlayerStatsRow = {
  playerId: string
  displayName: string
  gamesPlayed: number
  totalBalance: number
  averagePerGame: number
  biggestWin: number
  biggestLoss: number
  winRatePercent: number
}

type PlayerStatsCardProps = {
  stats: PlayerStatsRow
  currency: Currency
  rank?: number
}

function formatMoney(symbol: string, amount: number, signed = false): string {
  if (signed && amount !== 0) {
    return `${amount > 0 ? '+' : '-'}${symbol}${Math.abs(amount)}`
  }
  return `${symbol}${Math.abs(amount)}`
}

export function PlayerStatsCard({ stats, currency, rank }: PlayerStatsCardProps) {
  const symbol = t.currency[currency]
  const hasGames = stats.gamesPlayed > 0

  return (
    <Card elevated={rank === 1}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {rank !== undefined && (
            <span className="text-sm text-text-muted shrink-0">{rank}.</span>
          )}
          <h3 className="font-semibold text-text-primary truncate">
            {stats.displayName}
          </h3>
        </div>
        {hasGames && (
          <span
            className={`text-lg font-bold font-mono shrink-0 ${
              stats.totalBalance >= 0 ? 'text-positive' : 'text-negative'
            }`}
            dir="ltr"
          >
            {formatMoney(symbol, stats.totalBalance)}
          </span>
        )}
      </div>

      {!hasGames ? (
        <p className="text-sm text-text-muted">{t.stats.noGamesYet}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <StatCell
            label={t.stats.averagePerGame}
            value={formatMoney(symbol, stats.averagePerGame, true)}
            valueClass={
              stats.averagePerGame >= 0 ? 'text-positive' : 'text-negative'
            }
          />
          <StatCell
            label={t.stats.gamesPlayed}
            value={String(stats.gamesPlayed)}
          />
          <StatCell
            label={t.stats.biggestWin}
            value={formatMoney(symbol, stats.biggestWin)}
            valueClass="text-positive"
          />
          <StatCell
            label={t.stats.biggestLoss}
            value={formatMoney(symbol, Math.abs(stats.biggestLoss))}
            valueClass="text-negative"
          />
          <StatCell
            label={t.stats.winRate}
            value={`${stats.winRatePercent}%`}
            className="col-span-2"
          />
        </div>
      )}
    </Card>
  )
}

function StatCell({
  label,
  value,
  valueClass = 'text-text-primary',
  className = '',
}: {
  label: string
  value: string
  valueClass?: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-text-muted mb-0.5">{label}</p>
      <p className={`font-mono font-semibold ${valueClass}`} dir="ltr">
        {value}
      </p>
    </div>
  )
}
