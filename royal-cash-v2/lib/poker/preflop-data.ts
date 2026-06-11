// 8-max GTO RFI (Raise First In) ranges @ 100bb.
// Grid is 13×13: RANK_LABELS[0]=A … RANK_LABELS[12]=2
// Cell (i,j): i===j pair | i<j suited | i>j offsuit

import { parseRangeString } from './preflop-range-parser'

export type PreflopAction = 'R' | 'F' | 'L' | 'C'

/** 8-max RFI positions (BB excluded — defense only). */
export type Position = 'UTG' | 'UTG1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB'

export const POSITIONS: Position[] = [
  'UTG',
  'UTG1',
  'LJ',
  'HJ',
  'CO',
  'BTN',
  'SB',
]

export const POSITION_LABELS: Record<Position, string> = {
  UTG: 'UTG',
  UTG1: 'UTG+1',
  LJ: 'LJ',
  HJ: 'HJ',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
}

export const RANK_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

// Standard 100bb GTO RFI range strings (8-max)
const RFI_RANGES: Record<Position, string> = {
  UTG: '77+, ATs+, KTs+, QTs+, JTs, T9s, AQo+',
  UTG1: '55+, A9s+, K9s+, QTs+, JTs, T9s, 98s, AJo+, KQo',
  LJ: '44+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, ATo+, KQo',
  HJ: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, ATo+, KJo+, QJo',
  CO: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, A8o+, KTo+, QTo+, JTo',
  BTN: '22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o',
  SB: '22+, A2s+, K2s+, Q2s+, J4s+, T5s+, 95s+, 85s+, 74s+, 64s+, 54s, A2o+, K8o+, Q8o+, J8o+, T8o+',
}

type HandMap = Record<string, PreflopAction>

function buildHandKey(i: number, j: number): string {
  const r = RANK_LABELS
  if (i === j) return r[i] + r[j]
  if (i < j) return r[i] + r[j] + 's'
  return r[j] + r[i] + 'o'
}

function buildGrid(handMap: HandMap): PreflopAction[][] {
  return Array.from({ length: 13 }, (_, i) =>
    Array.from({ length: 13 }, (_, j) => {
      const key = buildHandKey(i, j)
      return handMap[key] ?? 'F'
    }),
  )
}

function buildCharts(): Record<Position, PreflopAction[][]> {
  const charts = {} as Record<Position, PreflopAction[][]>
  for (const pos of POSITIONS) {
    charts[pos] = buildGrid(parseRangeString(RFI_RANGES[pos]))
  }
  return charts
}

export const PREFLOP_CHARTS: Record<Position, PreflopAction[][]> = buildCharts()

export const ACTION_COLORS: Record<PreflopAction, string> = {
  R: '#22c55e',
  C: '#facc15',
  L: '#60a5fa',
  F: '#374151',
}

export const ACTION_BG: Record<PreflopAction, string> = {
  R: 'bg-green-500/80',
  C: 'bg-yellow-400/80',
  L: 'bg-blue-400/80',
  F: 'bg-surface-elevated',
}

export function getHandKey(i: number, j: number): string {
  return buildHandKey(i, j)
}

export function countRaisePercent(grid: PreflopAction[][]): number {
  let raise = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell === 'R') raise++
    }
  }
  return Math.round((raise / 169) * 100)
}
