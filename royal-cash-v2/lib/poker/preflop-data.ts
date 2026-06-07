// Pre-flop GTO RFI (Raise First In) ranges for 6-max cash game.
// Grid is 13×13: rows/cols indexed 0=Ace, 1=King, ..., 12=Two
// grid[row][col]:
//   row === col → pair (e.g., [0][0] = AA)
//   row > col  → suited (e.g., [1][0] = AKs because row=K=1, col=A=0 → higher col = higher card, suited upper-right)
// Convention: upper-right triangle (col < row in A-first indexing) = suited; lower-left = offsuit
//
// Simpler: we encode actions as a flat string of 169 chars, read row by row A→2.
// Each char: R=raise, F=fold, L=limp, C=call
//
// Positions: UTG, HJ, CO, BTN, SB

export type PreflopAction = 'R' | 'F' | 'L' | 'C'
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB'

export const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB']
export const POSITION_LABELS: Record<Position, string> = {
  UTG: 'UTG',
  HJ: 'HJ',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
}

// Rank labels high→low: A K Q J T 9 8 7 6 5 4 3 2
export const RANK_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

// Build action table from a set of raising hands.
// Hands are named like 'AA', 'AKs', 'AKo', 'AKs+' etc.
// For the chart, we directly provide a 169-length string.

// Helper: index into 169-element grid
// row=0 (Ace), col=0 (Ace)
// i > j → offsuit (AKo: i=0 Ace, j=1 King? No...)
// Let's define: cell (i,j) where i=row from top, j=col from left
//   i===j: pair
//   j < i: upper-right triangle when displayed = SUITED (hand: rankLabels[j] + rankLabels[i] + 's', where j has higher label index = lower rank... wait)
//
// Standard grid display: rows = first card rank (A→2), cols = second card rank (A→2)
// Upper-right triangle (col > row... no, col < row means A is 0):
//   Actually: in a standard poker matrix, the top-left is AA.
//   Going right from AA: AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s
//   Going down from AA: AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o
//   So: row i, col j, i < j → suited (col rank > row rank)? No...
//
// Let r[i] = rank at row i (r[0]=A=12, r[1]=K=11, ..., r[12]=2=0 in 0-based card rank)
// Cell (i,j):
//   i === j: pair of rank r[i]
//   i < j: suited hand with higher rank r[i], lower rank r[j] → e.g., (0,1) = AKs
//   i > j: offsuit hand with higher rank r[j], lower rank r[i] → e.g., (1,0) = AKo
//
// So upper-right triangle (i < j) = suited, lower-left (i > j) = offsuit. ✓

type HandMap = Record<string, PreflopAction>

function buildHandKey(i: number, j: number): string {
  const r = RANK_LABELS
  if (i === j) return r[i] + r[j] // pair
  if (i < j) return r[i] + r[j] + 's' // suited (i < j → higher label comes first)
  return r[j] + r[i] + 'o' // offsuit (j < i → j has higher rank)
}

function buildGrid(handMap: HandMap): PreflopAction[][] {
  return Array.from({ length: 13 }, (_, i) =>
    Array.from({ length: 13 }, (_, j) => {
      const key = buildHandKey(i, j)
      return handMap[key] ?? 'F'
    }),
  )
}

// UTG RFI: ~14% (tight)
const UTG_HANDS: HandMap = {
  // All pairs 22+
  AA: 'R', KK: 'R', QQ: 'R', JJ: 'R', TT: 'R', '99': 'R', '88': 'R', '77': 'R',
  '66': 'R', '55': 'R', '44': 'R', '33': 'R', '22': 'R',
  // Broadway suited
  AKs: 'R', AQs: 'R', AJs: 'R', ATs: 'R', A9s: 'R', A8s: 'R', A7s: 'R', A6s: 'R', A5s: 'R', A4s: 'R', A3s: 'R', A2s: 'R',
  KQs: 'R', KJs: 'R', KTs: 'R', K9s: 'R',
  QJs: 'R', QTs: 'R', Q9s: 'R',
  JTs: 'R', J9s: 'R',
  T9s: 'R', T8s: 'R',
  '98s': 'R', '97s': 'R',
  '87s': 'R', '86s': 'R',
  '76s': 'R', '75s': 'R',
  '65s': 'R',
  '54s': 'R',
  // Broadway offsuit
  AKo: 'R', AQo: 'R', AJo: 'R', ATo: 'R', A9o: 'R', A8o: 'R',
  KQo: 'R', KJo: 'R',
  QJo: 'R',
  JTo: 'R',
}

// HJ RFI: ~22%
const HJ_HANDS: HandMap = {
  ...UTG_HANDS,
  A7o: 'R', A6o: 'R', A5o: 'R',
  KTo: 'R', K9o: 'R',
  QTo: 'R',
  '98o': 'R',
  '87o': 'R',
  '85s': 'R',
  '74s': 'R',
  '64s': 'R',
  '53s': 'R',
  '43s': 'R',
}

// CO RFI: ~30%
const CO_HANDS: HandMap = {
  ...HJ_HANDS,
  A4o: 'R', A3o: 'R', A2o: 'R',
  K8o: 'R', K8s: 'R', K7s: 'R', K6s: 'R', K5s: 'R', K4s: 'R', K3s: 'R', K2s: 'R',
  Q8s: 'R', Q8o: 'R', Q7s: 'R',
  J8s: 'R', J8o: 'R', J7s: 'R',
  T7s: 'R', T7o: 'R',
  '97o': 'R', '96s': 'R',
  '86o': 'R', '85o': 'R',
  '76o': 'R', '74o': 'R',
  '64o': 'R',
  '53o': 'R', '52s': 'R',
  '42s': 'R',
  '32s': 'R',
}

// BTN RFI: ~45%
const BTN_HANDS: HandMap = {
  ...CO_HANDS,
  K8o: 'R', K7o: 'R',
  Q9o: 'R',
  J9o: 'R',
  T9o: 'R',
  '96o': 'R',
  '75o': 'R',
  '63s': 'R',
  '52o': 'R',
  '42o': 'R',
  '32o': 'R',
  '43o': 'R',
  '54o': 'R',
}

// SB RFI (vs BB): ~45% raise, ~10% limp
const SB_HANDS: HandMap = {
  ...BTN_HANDS,
  K6o: 'R', K5o: 'R', K4o: 'R', K3o: 'R', K2o: 'R',
  Q6o: 'R', Q6s: 'R', Q5s: 'R', Q4s: 'R', Q3s: 'R', Q2s: 'R',
  J6s: 'R', J5s: 'R', J6o: 'R',
  T6s: 'R', T5s: 'R',
  '95s': 'R', '94s': 'R',
  '84s': 'R', '83s': 'R',
  '73s': 'R', '72s': 'R',
  '62s': 'R',
  // Some limps from SB
  Q5o: 'L', Q4o: 'L', Q3o: 'L', Q2o: 'L',
  J5o: 'L', J4o: 'L', J4s: 'L',
  T5o: 'L', T4o: 'L', T4s: 'L',
  '93o': 'L', '93s': 'L',
  '82o': 'L', '82s': 'L',
  '72o': 'L',
  '62o': 'L',
}

export const PREFLOP_CHARTS: Record<Position, PreflopAction[][]> = {
  UTG: buildGrid(UTG_HANDS),
  HJ: buildGrid(HJ_HANDS),
  CO: buildGrid(CO_HANDS),
  BTN: buildGrid(BTN_HANDS),
  SB: buildGrid(SB_HANDS),
}

export const ACTION_COLORS: Record<PreflopAction, string> = {
  R: '#22c55e', // green
  C: '#facc15', // yellow
  L: '#60a5fa', // blue
  F: '#374151', // dark gray
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
  for (const row of grid) for (const cell of row) if (cell === 'R') raise++
  return Math.round((raise / 169) * 100)
}
