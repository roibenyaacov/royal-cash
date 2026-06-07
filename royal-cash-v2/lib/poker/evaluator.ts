// Card encoding: 0–51
// rank = card % 13  → 0=2, 1=3, ..., 12=Ace
// suit = floor(card / 13) → 0=♣, 1=♦, 2=♥, 3=♠

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
export const SUITS = ['♣', '♦', '♥', '♠']
export const SUIT_COLORS = ['text-green-400', 'text-red-400', 'text-red-400', 'text-text-primary']

export function cardRank(card: number): number {
  return card % 13
}

export function cardSuit(card: number): number {
  return Math.floor(card / 13)
}

export function cardLabel(card: number): string {
  return RANKS[cardRank(card)] + SUITS[cardSuit(card)]
}

export function makeCard(rank: number, suit: number): number {
  return suit * 13 + rank
}

function checkStraight(sortedDesc: number[]): { isStraight: boolean; high: number } {
  const unique = [...new Set(sortedDesc)]
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) {
      return { isStraight: true, high: unique[i] }
    }
  }
  // Wheel: A-2-3-4-5
  if (
    unique.includes(12) &&
    unique.includes(3) &&
    unique.includes(2) &&
    unique.includes(1) &&
    unique.includes(0)
  ) {
    return { isStraight: true, high: 3 }
  }
  return { isStraight: false, high: 0 }
}

function encodeScore(handRank: number, kickers: number[]): number {
  let s = handRank * 371293 // 13^5
  const bases = [28561, 2197, 169, 13, 1] // 13^4..13^0
  for (let i = 0; i < kickers.length && i < 5; i++) {
    s += kickers[i] * bases[i]
  }
  return s
}

export function evaluate5(cards: number[]): number {
  const ranks = cards.map(cardRank).sort((a, b) => b - a)
  const suits = cards.map(cardSuit)

  const isFlush = suits.every((s) => s === suits[0])
  const { isStraight, high: straightHigh } = checkStraight(ranks)

  // Count frequencies
  const freq = new Map<number, number>()
  for (const r of ranks) freq.set(r, (freq.get(r) ?? 0) + 1)

  const sorted = [...freq.entries()].sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0],
  )

  const [[r1, c1], [r2, c2] = [0, 0]] = sorted

  if (isFlush && isStraight) return encodeScore(8, [straightHigh])
  if (c1 === 4) return encodeScore(7, [r1, sorted.find(([r]) => r !== r1)![0]])
  if (c1 === 3 && c2 === 2) return encodeScore(6, [r1, r2])
  if (isFlush) return encodeScore(5, ranks.slice(0, 5))
  if (isStraight) return encodeScore(4, [straightHigh])
  if (c1 === 3) return encodeScore(3, [r1, ...ranks.filter((r) => r !== r1).slice(0, 2)])
  if (c1 === 2 && c2 === 2) {
    const kicker = ranks.find((r) => r !== r1 && r !== r2)!
    return encodeScore(2, [r1, r2, kicker])
  }
  if (c1 === 2) return encodeScore(1, [r1, ...ranks.filter((r) => r !== r1).slice(0, 3)])
  return encodeScore(0, ranks.slice(0, 5))
}

// Best hand from 7 cards (Texas Hold'em — try all C(7,5)=21 combos)
export function evaluate7(cards: number[]): number {
  let best = -1
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const five = cards.filter((_, idx) => idx !== i && idx !== j)
      const s = evaluate5(five)
      if (s > best) best = s
    }
  }
  return best
}

// Best hand from exactly 2 hole + 3 board cards (Omaha)
export function evaluateOmaha(hole: number[], board: number[]): number {
  let best = -1
  for (let i = 0; i < hole.length; i++) {
    for (let j = i + 1; j < hole.length; j++) {
      for (let a = 0; a < board.length; a++) {
        for (let b = a + 1; b < board.length; b++) {
          for (let c = b + 1; c < board.length; c++) {
            const s = evaluate5([hole[i], hole[j], board[a], board[b], board[c]])
            if (s > best) best = s
          }
        }
      }
    }
  }
  return best
}
