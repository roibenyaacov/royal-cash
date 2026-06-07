export function calcAveragePerGame(
  totalBalance: number,
  gamesPlayed: number,
): number {
  if (gamesPlayed <= 0) return 0
  return Math.round(totalBalance / gamesPlayed)
}

export function calcWinRatePercent(wins: number, gamesPlayed: number): number {
  if (gamesPlayed <= 0) return 0
  return Math.round((wins / gamesPlayed) * 100)
}
