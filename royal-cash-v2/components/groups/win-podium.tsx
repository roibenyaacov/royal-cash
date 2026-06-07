import { t } from '@/lib/i18n/dictionary'
import type { Currency, GroupWinRecord } from '@/lib/domain/types'

type WinPodiumProps = {
  records: GroupWinRecord[]
  playerNames: Map<string, string>
  currency: Currency
}

const podiumMeta = [
  { rank: 2, emoji: '🥈', height: 'h-[72px]', width: 'flex-1' },
  { rank: 1, emoji: '🥇', height: 'h-[96px]', width: 'flex-[1.15]' },
  { rank: 3, emoji: '🥉', height: 'h-[60px]', width: 'flex-1' },
] as const

export function WinPodium({ records, playerNames, currency }: WinPodiumProps) {
  const symbol = t.currency[currency]

  if (records.length === 0) {
    return (
      <p className="text-sm text-text-muted">{t.groups.podiumEmpty}</p>
    )
  }

  const topThree = records.slice(0, 3)

  const slots = [
    topThree[1],
    topThree[0],
    topThree[2],
  ] as const

  return (
    <div className="flex items-end justify-center gap-2 px-1">
        {podiumMeta.map((meta, index) => {
          const record = slots[index]
          if (!record) {
            return (
              <div key={meta.rank} className={`${meta.width} flex flex-col items-center`}>
                <div className="w-full rounded-t-[var(--radius-card)] border border-dashed border-border bg-surface/50 flex items-center justify-center text-text-muted text-sm min-h-[48px]">
                  —
                </div>
                <div className={`w-full ${meta.height} bg-surface-elevated/40 rounded-b-md`} />
              </div>
            )
          }

          const name = playerNames.get(record.player_id) ?? record.player_id

          return (
            <div
              key={record.id}
              className={`${meta.width} flex flex-col items-center min-w-0`}
            >
              <div className="w-full mb-2 text-center px-1">
                <p className="text-lg leading-none mb-1">{meta.emoji}</p>
                <p className="font-semibold text-text-primary text-sm truncate w-full">
                  {name}
                </p>
                <p
                  className="text-base font-bold font-mono text-accent mt-0.5"
                  dir="ltr"
                >
                  {symbol}
                  {record.amount}
                </p>
              </div>
              <div
                className={`w-full ${meta.height} rounded-t-[var(--radius-card)] bg-gradient-to-t from-accent/25 to-accent/10 border border-accent/30 border-b-0 flex items-end justify-center pb-2`}
              >
                <span className="text-xs font-bold text-accent/80">{meta.rank}</span>
              </div>
              <div className="w-full h-2 bg-surface-elevated rounded-b-md border border-border border-t-0" />
            </div>
          )
        })}
    </div>
  )
}
