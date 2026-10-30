import { describe, it, expect } from 'vitest'
import { buildBalanceSeries } from './balance-series'

const NOW = new Date('2026-10-30T12:00:00Z')

function entry(
  daysAgo: number,
  finalBalance: number,
  id = `g${daysAgo}`,
): {
  gameId: string
  gameName: string
  finalBalance: number
  gameDate: string
  finalizedAt: string
} {
  const at = new Date(NOW.getTime() - daysAgo * 86_400_000)
  return {
    gameId: id,
    gameName: `game ${id}`,
    finalBalance,
    gameDate: at.toISOString().slice(0, 10),
    finalizedAt: at.toISOString(),
  }
}

describe('buildBalanceSeries', () => {
  it('returns an empty series for no history', () => {
    const s = buildBalanceSeries([], 'all', NOW)
    expect(s.points).toEqual([])
    expect(s.net).toBe(0)
    expect(s.games).toBe(0)
  })

  it('accumulates in chronological order regardless of input order', () => {
    const history = [entry(1, -50), entry(10, 200), entry(5, 100)]
    const s = buildBalanceSeries(history, 'all', NOW)

    expect(s.points.map((p) => p.change)).toEqual([200, 100, -50])
    expect(s.points.map((p) => p.cumulative)).toEqual([200, 300, 250])
    expect(s.net).toBe(250)
  })

  it('orders by finalizedAt, not by the calendar date', () => {
    // Two tables on the same night: the one saved later must come second,
    // which a sort on gameDate alone could not decide.
    const sameDay = [
      {
        gameId: 'late',
        gameName: 'late',
        finalBalance: -100,
        gameDate: '2026-10-20',
        finalizedAt: '2026-10-21T03:00:00Z',
      },
      {
        gameId: 'early',
        gameName: 'early',
        finalBalance: 300,
        gameDate: '2026-10-20',
        finalizedAt: '2026-10-20T22:00:00Z',
      },
    ]
    const s = buildBalanceSeries(sameDay, 'all', NOW)
    expect(s.points.map((p) => p.gameId)).toEqual(['early', 'late'])
    expect(s.points.map((p) => p.cumulative)).toEqual([300, 200])
  })

  it('keeps only games inside the window', () => {
    const history = [entry(5, 100), entry(45, 500), entry(200, -300)]

    const last30 = buildBalanceSeries(history, '30d', NOW)
    expect(last30.games).toBe(1)
    expect(last30.net).toBe(100)

    const last90 = buildBalanceSeries(history, '90d', NOW)
    expect(last90.games).toBe(2)
    expect(last90.net).toBe(600)

    const all = buildBalanceSeries(history, 'all', NOW)
    expect(all.games).toBe(3)
    expect(all.net).toBe(300)
  })

  it('starts the window at zero rather than carrying the all-time total in', () => {
    const history = [entry(100, 1000), entry(2, -40)]
    const s = buildBalanceSeries(history, '30d', NOW)

    expect(s.points).toHaveLength(1)
    expect(s.points[0].cumulative).toBe(-40)
  })

  it('counts wins and losses, and ignores a break-even game in both', () => {
    const history = [entry(1, 100), entry(2, -60), entry(3, 0)]
    const s = buildBalanceSeries(history, 'all', NOW)

    expect(s.games).toBe(3)
    expect(s.wins).toBe(1)
    expect(s.losses).toBe(1)
  })

  it('reports the best and worst single game', () => {
    const history = [entry(1, 100), entry(2, -250), entry(3, 400)]
    const s = buildBalanceSeries(history, 'all', NOW)

    expect(s.best).toBe(400)
    expect(s.worst).toBe(-250)
  })

  it('tracks the cumulative range including zero, for axis scaling', () => {
    // Always underwater: max must stay at 0 so the zero line is on the chart.
    const s = buildBalanceSeries([entry(3, -100), entry(2, -50)], 'all', NOW)
    expect(s.min).toBe(-150)
    expect(s.max).toBe(0)

    // Always ahead: min stays at 0 for the same reason.
    const up = buildBalanceSeries([entry(3, 100), entry(2, 50)], 'all', NOW)
    expect(up.min).toBe(0)
    expect(up.max).toBe(150)
  })

  it('returns empty when the window excludes everything', () => {
    const s = buildBalanceSeries([entry(400, 999)], '30d', NOW)
    expect(s.points).toEqual([])
    expect(s.net).toBe(0)
  })

  it('skips an entry whose finalizedAt is unparseable instead of throwing', () => {
    const broken = {
      gameId: 'bad',
      gameName: 'bad',
      finalBalance: 100,
      gameDate: '2026-10-20',
      finalizedAt: 'not-a-date',
    }
    const s = buildBalanceSeries([broken, entry(1, 50)], '30d', NOW)
    expect(s.games).toBe(1)
    expect(s.net).toBe(50)
  })
})
