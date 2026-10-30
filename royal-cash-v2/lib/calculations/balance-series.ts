/**
 * Turns a personal game history into a cumulative balance series for a chart.
 *
 * The history arrives newest-first (that is the order the profile list wants)
 * and each entry carries only that one game's result. A chart of "how am I
 * doing" needs the running total in chronological order instead, so this
 * reverses and accumulates.
 *
 * Windowing happens before accumulating, deliberately: the first point of a
 * 30-day view is that window's first game, not the all-time total carried
 * forward. The question the chart answers is "what did the last 30 days do to
 * me", and a window that opened at +2000 would bury the shape of the recent
 * games under a constant.
 */

export type BalancePoint = {
  /** ISO date of the game (calendar date, not the finalize timestamp). */
  date: string
  /** This game's own result. */
  change: number
  /** Running total within the window, including this game. */
  cumulative: number
  gameId: string
  gameName: string
}

export type BalanceSeries = {
  points: BalancePoint[]
  /** Window totals, over the points actually included. */
  net: number
  games: number
  wins: number
  losses: number
  best: number
  worst: number
  /** Range of `cumulative` across the series, for scaling an axis. */
  min: number
  max: number
}

export type RangeKey = '30d' | '90d' | '365d' | 'all'

export const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '365d': 365,
}

type HistoryEntry = {
  gameId: string
  gameName: string
  finalBalance: number
  gameDate: string
  finalizedAt: string
}

const EMPTY: BalanceSeries = {
  points: [],
  net: 0,
  games: 0,
  wins: 0,
  losses: 0,
  best: 0,
  worst: 0,
  min: 0,
  max: 0,
}

/**
 * @param history   Personal game history, any order.
 * @param range     Window to keep.
 * @param now       Reference point for the window; injected so this is testable.
 */
export function buildBalanceSeries(
  history: HistoryEntry[],
  range: RangeKey,
  now: Date = new Date(),
): BalanceSeries {
  if (history.length === 0) return EMPTY

  // Ordered by when the game was actually saved, not by its calendar date:
  // two tables can carry the same date, and a late-night game is often
  // finalized the next morning. finalizedAt is the only monotonic field.
  const chronological = [...history].sort(
    (a, b) =>
      new Date(a.finalizedAt).getTime() - new Date(b.finalizedAt).getTime(),
  )

  const windowed =
    range === 'all'
      ? chronological
      : chronological.filter((entry) => {
          const at = new Date(entry.finalizedAt).getTime()
          if (Number.isNaN(at)) return false
          return at >= now.getTime() - RANGE_DAYS[range] * 86_400_000
        })

  if (windowed.length === 0) return EMPTY

  const points: BalancePoint[] = []
  let cumulative = 0
  let wins = 0
  let losses = 0
  let best = windowed[0].finalBalance
  let worst = windowed[0].finalBalance
  let min = 0
  let max = 0

  for (const entry of windowed) {
    cumulative += entry.finalBalance
    if (entry.finalBalance > 0) wins += 1
    else if (entry.finalBalance < 0) losses += 1
    if (entry.finalBalance > best) best = entry.finalBalance
    if (entry.finalBalance < worst) worst = entry.finalBalance
    if (cumulative < min) min = cumulative
    if (cumulative > max) max = cumulative

    points.push({
      date: entry.gameDate,
      change: entry.finalBalance,
      cumulative,
      gameId: entry.gameId,
      gameName: entry.gameName,
    })
  }

  return {
    points,
    net: cumulative,
    games: windowed.length,
    wins,
    losses,
    best,
    worst,
    min,
    max,
  }
}
