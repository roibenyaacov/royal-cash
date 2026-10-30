'use client'

import { useMemo, useState } from 'react'
import { t } from '@/lib/i18n/dictionary'
import {
  buildBalanceSeries,
  type RangeKey,
} from '@/lib/calculations/balance-series'
import type { PersonalGameHistoryEntry } from '@/lib/db/profile'

type BalanceChartProps = {
  history: PersonalGameHistoryEntry[]
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '30d', label: t.profile.range30d },
  { key: '90d', label: t.profile.range90d },
  { key: '365d', label: t.profile.range365d },
  { key: 'all', label: t.profile.rangeAll },
]

// Drawn in a fixed viewBox and scaled by CSS, so there is no measuring of the
// container and no resize handling — the SVG just fills whatever width it gets.
const W = 320
const H = 150
const PAD_X = 6
const PAD_TOP = 10
const PAD_BOTTOM = 14

const symbol = t.currency.ILS

function formatSigned(amount: number): string {
  const abs = Math.abs(amount)
  if (amount > 0) return `+${symbol}${abs}`
  if (amount < 0) return `-${symbol}${abs}`
  return `${symbol}0`
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export function BalanceChart({ history }: BalanceChartProps) {
  const [range, setRange] = useState<RangeKey>('90d')

  const series = useMemo(() => buildBalanceSeries(history, range), [history, range])

  // The y axis always spans zero so the break-even line is on the chart, and
  // it gets a little headroom so the line never runs along the very edge.
  const { min, max } = series
  const span = Math.max(max - min, 1)
  const headroom = span * 0.12
  const yTop = max + headroom
  const yBottom = min - headroom
  const ySpan = yTop - yBottom || 1

  const plotH = H - PAD_TOP - PAD_BOTTOM
  const toY = (value: number) =>
    PAD_TOP + ((yTop - value) / ySpan) * plotH

  const n = series.points.length
  const toX = (index: number) => {
    if (n <= 1) return W / 2
    return PAD_X + (index / (n - 1)) * (W - PAD_X * 2)
  }

  const zeroY = toY(0)

  const linePath = useMemo(() => {
    if (n === 0) return ''
    return series.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.cumulative).toFixed(1)}`)
      .join(' ')
    // toX/toY close over the same scale inputs the series produced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, yTop, ySpan])

  // Closed under the line down to the zero line, so being ahead shades up
  // from break-even and being behind shades down from it.
  const areaPath = useMemo(() => {
    if (n === 0) return ''
    const first = `M${toX(0).toFixed(1)},${zeroY.toFixed(1)}`
    const line = series.points
      .map((p, i) => `L${toX(i).toFixed(1)},${toY(p.cumulative).toFixed(1)}`)
      .join(' ')
    return `${first} ${line} L${toX(n - 1).toFixed(1)},${zeroY.toFixed(1)} Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, yTop, ySpan, zeroY])

  const up = series.net >= 0
  const stroke = up ? 'var(--color-positive)' : 'var(--color-negative)'

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-text-primary">
          {t.profile.chartTitle}
        </p>
        <span
          className={`text-sm font-bold ${up ? 'text-positive' : 'text-negative'}`}
          dir="ltr"
        >
          {formatSigned(series.net)}
        </span>
      </div>

      <div
        className="flex gap-1 mb-3 p-1 rounded-[10px] bg-surface-elevated border border-border"
        role="tablist"
        aria-label={t.profile.chartRangeLabel}
      >
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 py-1.5 rounded-[7px] text-xs font-medium min-h-[32px]
              transition-colors ${
                range === r.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted active:bg-surface'
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {series.points.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">
          {t.profile.chartNoGamesInRange}
        </p>
      ) : (
        <>
          {/* dir="ltr" so time reads left-to-right even in the RTL layout:
              a chart whose x axis flipped with the page would put the newest
              game on the left, which nobody reads that way. */}
          <div dir="ltr">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto block"
              role="img"
              aria-label={t.profile.chartTitle}
            >
              <defs>
                <linearGradient id="rc-balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* break-even */}
              <line
                x1={PAD_X}
                y1={zeroY}
                x2={W - PAD_X}
                y2={zeroY}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {areaPath && <path d={areaPath} fill="url(#rc-balance-fill)" />}

              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* A single game has no line to speak of, so mark the point. */}
              {series.points.map((p, i) =>
                n === 1 || i === n - 1 ? (
                  <circle
                    key={p.gameId}
                    cx={toX(i)}
                    cy={toY(p.cumulative)}
                    r="3"
                    fill={stroke}
                  />
                ) : null,
              )}
            </svg>

            <div className="flex justify-between px-1 mt-1">
              <span className="text-[10px] text-text-muted">
                {formatShortDate(series.points[0].date)}
              </span>
              <span className="text-[10px] text-text-muted">
                {formatShortDate(series.points[n - 1].date)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3">
            <Stat label={t.profile.chartGames} value={String(series.games)} />
            <Stat
              label={t.profile.chartWins}
              value={`${series.wins}/${series.games}`}
            />
            <Stat
              label={t.profile.chartBest}
              value={formatSigned(series.best)}
              tone={series.best > 0 ? 'positive' : undefined}
            />
            <Stat
              label={t.profile.chartWorst}
              value={formatSigned(series.worst)}
              tone={series.worst < 0 ? 'negative' : undefined}
            />
          </div>
        </>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}) {
  const color =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : 'text-text-primary'
  return (
    <div className="rounded-[10px] bg-surface-elevated border border-border px-2 py-2 text-center">
      <p className={`text-xs font-bold ${color}`} dir="ltr">
        {value}
      </p>
      <p className="text-[10px] text-text-muted mt-0.5 truncate">{label}</p>
    </div>
  )
}
