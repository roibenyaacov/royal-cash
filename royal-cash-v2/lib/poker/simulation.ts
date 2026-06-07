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

export function runSimulation(params: {
  heroHole: number[]
  villainHole: number[] | null
  board: number[]
  gameType: GameType
  runOuts: RunOuts
  iterations?: number
}): SimResult {
  const { heroHole, villainHole, board, gameType, runOuts, iterations = 10000 } = params

  const holeSize = gameType === 'omaha' ? 4 : 2
  const boardNeeded = 5 - board.length
  const villainHoleNeeded = villainHole ? 0 : holeSize

  const knownSet = new Set([...heroHole, ...(villainHole ?? []), ...board])
  const deck = Array.from({ length: 52 }, (_, i) => i).filter((c) => !knownSet.has(c))

  const totalCardsNeeded = villainHoleNeeded + boardNeeded * runOuts

  let wins = 0
  let ties = 0
  let losses = 0

  for (let iter = 0; iter < iterations; iter++) {
    if (deck.length < totalCardsNeeded) break

    const shuffled = shuffle(deck)
    let offset = 0

    const vHole = villainHole ?? shuffled.slice(offset, offset + villainHoleNeeded)
    offset += villainHoleNeeded

    let runWins = 0
    let runTies = 0
    let runLosses = 0

    for (let run = 0; run < runOuts; run++) {
      const runBoard = [...board, ...shuffled.slice(offset + run * boardNeeded, offset + (run + 1) * boardNeeded)]

      let heroScore: number
      let villainScore: number

      if (gameType === 'omaha') {
        heroScore = evaluateOmaha(heroHole, runBoard)
        villainScore = evaluateOmaha(vHole, runBoard)
      } else {
        heroScore = evaluate7([...heroHole, ...runBoard])
        villainScore = evaluate7([...vHole, ...runBoard])
      }

      if (heroScore > villainScore) runWins++
      else if (heroScore === villainScore) runTies++
      else runLosses++
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
