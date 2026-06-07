import { evaluate7, evaluateOmaha } from './evaluator'

export type GameType = 'holdem' | 'omaha'
export type RunOuts = 1 | 2 | 3

export type SimResult = {
  win: number
  tie: number
  lose: number
}

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function scoreHand(hole: number[], board: number[], gameType: GameType): number {
  if (gameType === 'omaha') return evaluateOmaha(hole, board)
  return evaluate7([...hole, ...board])
}

/** null = deal random hole cards for that villain */
export type VillainHole = number[] | null

export function runSimulation(params: {
  heroHole: number[]
  /** One entry per villain; null = random hole. Defaults to one random villain. */
  villainHoles?: VillainHole[]
  board: number[]
  gameType: GameType
  runOuts: RunOuts
  iterations?: number
}): SimResult {
  const { heroHole, board, gameType, runOuts, iterations = 10000 } = params
  const villains = params.villainHoles?.length ? params.villainHoles : [null]

  const holeSize = gameType === 'omaha' ? 4 : 2
  const boardNeeded = 5 - board.length

  const knownCards = [...heroHole, ...board]
  for (const v of villains) {
    if (v) knownCards.push(...v)
  }
  const knownSet = new Set(knownCards)
  const deck = Array.from({ length: 52 }, (_, i) => i).filter((c) => !knownSet.has(c))

  const randomHolesNeeded = villains.filter((v) => v === null).length * holeSize
  const totalCardsNeeded = randomHolesNeeded + boardNeeded * runOuts

  let wins = 0
  let ties = 0
  let losses = 0

  for (let iter = 0; iter < iterations; iter++) {
    if (deck.length < totalCardsNeeded) break

    const shuffled = shuffle(deck)
    let offset = 0

    const resolvedVillains: number[][] = villains.map((v) => {
      if (v) return v
      const hole = shuffled.slice(offset, offset + holeSize)
      offset += holeSize
      return hole
    })

    let runWins = 0
    let runTies = 0
    let runLosses = 0

    for (let run = 0; run < runOuts; run++) {
      const runBoard = [...board, ...shuffled.slice(offset + run * boardNeeded, offset + (run + 1) * boardNeeded)]

      const heroScore = scoreHand(heroHole, runBoard, gameType)
      const villainScores = resolvedVillains.map((hole) => scoreHand(hole, runBoard, gameType))
      const bestScore = Math.max(heroScore, ...villainScores)

      if (heroScore < bestScore) {
        runLosses++
      } else {
        const tiedAtBest =
          1 + villainScores.filter((s) => s === bestScore).length
        if (heroScore === bestScore && tiedAtBest === 1) runWins++
        else runTies++
      }
    }

    wins += runWins / runOuts
    ties += runTies / runOuts
    losses += runLosses / runOuts
  }

  const total = wins + ties + losses || 1
  return {
    win: wins / total,
    tie: ties / total,
    lose: losses / total,
  }
}
