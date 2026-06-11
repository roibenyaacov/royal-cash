export type RangeAction = 'R' | 'F' | 'L' | 'C'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const

const RANK_VALUE: Record<string, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, RANKS.length - 1 - i]),
)

export type HandMap = Record<string, RangeAction>

function pairKey(rank: string): string {
  return `${rank}${rank}`
}

function suitedKey(high: string, low: string): string {
  return `${high}${low}s`
}

function offsuitKey(high: string, low: string): string {
  return `${high}${low}o`
}

function addPairsFrom(minRank: string, hands: HandMap, action: RangeAction = 'R') {
  const minVal = RANK_VALUE[minRank]
  for (const rank of RANKS) {
    if (RANK_VALUE[rank] >= minVal) {
      hands[pairKey(rank)] = action
    }
  }
}

/** Suited combos with fixed high card, second card >= lowMin (e.g. ATs+ → ATs, AJs, AQs, AKs). */
function addSuitedHighFrom(high: string, lowMin: string, hands: HandMap, action: RangeAction = 'R') {
  const highVal = RANK_VALUE[high]
  const lowMinVal = RANK_VALUE[lowMin]
  for (const low of RANKS) {
    const lowVal = RANK_VALUE[low]
    if (lowVal < highVal && lowVal >= lowMinVal) {
      hands[suitedKey(high, low)] = action
    }
  }
}

/** Offsuit combos with fixed high card, second card >= lowMin. */
function addOffsuitHighFrom(high: string, lowMin: string, hands: HandMap, action: RangeAction = 'R') {
  const highVal = RANK_VALUE[high]
  const lowMinVal = RANK_VALUE[lowMin]
  for (const low of RANKS) {
    const lowVal = RANK_VALUE[low]
    if (lowVal < highVal && lowVal >= lowMinVal) {
      hands[offsuitKey(high, low)] = action
    }
  }
}

function parseToken(token: string, hands: HandMap, action: RangeAction = 'R') {
  const trimmed = token.trim()
  if (!trimmed) return

  if (trimmed.endsWith('+')) {
    const base = trimmed.slice(0, -1)

    // Pair+: 77+
    if (base.length === 2 && base[0] === base[1] && RANK_VALUE[base[0]] !== undefined) {
      addPairsFrom(base[0], hands, action)
      return
    }

    // Suited+: ATs+, A2s+, K9s+
    if (base.endsWith('s') && base.length === 3) {
      const high = base[0]
      const lowMin = base[1]
      if (RANK_VALUE[high] !== undefined && RANK_VALUE[lowMin] !== undefined) {
        addSuitedHighFrom(high, lowMin, hands, action)
        return
      }
    }

    // Offsuit+: AQo+, A2o+, T8o+
    if (base.endsWith('o') && base.length === 3) {
      const high = base[0]
      const lowMin = base[1]
      if (RANK_VALUE[high] !== undefined && RANK_VALUE[lowMin] !== undefined) {
        addOffsuitHighFrom(high, lowMin, hands, action)
        return
      }
    }
  }

  // Exact combo: JTs, T9s, KQo, T9o, AA, etc.
  if (/^([AKQJT2-9])\1$/.test(trimmed)) {
    hands[trimmed] = action
    return
  }
  if (/^[AKQJT2-9][AKQJT2-9]s$/.test(trimmed)) {
    hands[trimmed] = action
    return
  }
  if (/^[AKQJT2-9][AKQJT2-9]o$/.test(trimmed)) {
    hands[trimmed] = action
    return
  }
}

/** Parse comma-separated GTO range notation into a hand → action map. */
export function parseRangeString(range: string, action: RangeAction = 'R'): HandMap {
  const hands: HandMap = {}
  for (const token of range.split(',')) {
    parseToken(token, hands, action)
  }
  return hands
}
