import type { Game, GameResult } from '@/lib/domain/types'
import type { SettlementTransfer } from './settlement'

type PlayerNameMap = Map<string, string>

export function generateSummaryText(
  game: Pick<Game, 'name'>,
  results: GameResult[],
  settlements: SettlementTransfer[],
  playerNames: PlayerNameMap,
  locale: 'he' | 'en' = 'he',
): string {
  if (locale === 'he') return generateHebrew(game, results, settlements, playerNames)
  return generateEnglish(game, results, settlements, playerNames)
}

function formatBalance(amount: number): string {
  return amount >= 0 ? `+${amount}` : `${amount}`
}

function name(id: string, names: PlayerNameMap): string {
  return names.get(id) ?? id
}

function generateHebrew(
  game: Pick<Game, 'name'>,
  results: GameResult[],
  settlements: SettlementTransfer[],
  names: PlayerNameMap,
): string {
  const lines: string[] = [
    `סיכום Royal Cash`,
    `משחק: ${game.name}`,
    '',
    'תוצאות:',
  ]

  const sorted = [...results].sort((a, b) => b.final_balance - a.final_balance)
  for (const r of sorted) {
    lines.push(`${name(r.player_id, names)}: ${formatBalance(r.final_balance)}`)
  }

  if (settlements.length > 0) {
    lines.push('', 'קיזוזים:')
    for (const s of settlements) {
      lines.push(`${name(s.from, names)} משלם/ת ל${name(s.to, names)}: ${s.amount}`)
    }
  }

  return lines.join('\n')
}

function generateEnglish(
  game: Pick<Game, 'name'>,
  results: GameResult[],
  settlements: SettlementTransfer[],
  names: PlayerNameMap,
): string {
  const lines: string[] = [
    'Royal Cash Summary',
    `Game: ${game.name}`,
    '',
    'Results:',
  ]

  const sorted = [...results].sort((a, b) => b.final_balance - a.final_balance)
  for (const r of sorted) {
    lines.push(`${name(r.player_id, names)}: ${formatBalance(r.final_balance)}`)
  }

  if (settlements.length > 0) {
    lines.push('', 'Settlements:')
    for (const s of settlements) {
      lines.push(`${name(s.from, names)} → ${name(s.to, names)}: ${s.amount}`)
    }
  }

  return lines.join('\n')
}
