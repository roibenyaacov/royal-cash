import type { Game, GameResult } from '@/lib/domain/types'
import type { SettlementTransfer } from './settlement'

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€' }

/** Force RTL display for the table name line in WhatsApp (mixed Hebrew/Latin/numbers). */
function formatRtlGameName(name: string): string {
  return `\u202B${name}\u202C`
}

export function generateWhatsAppSettlementText(
  game: Pick<Game, 'name' | 'currency'>,
  settlements: SettlementTransfer[],
  playerNames: Map<string, string>,
): string {
  const symbol = CURRENCY_SYMBOLS[game.currency] ?? '₪'
  const lines: string[] = ['Royal Cash - סיכום שולחן', formatRtlGameName(game.name), '']

  if (settlements.length === 0) {
    lines.push('קיזוזים: אין')
  } else {
    for (const s of settlements) {
      const from = playerNames.get(s.from) ?? s.from
      const to = playerNames.get(s.to) ?? s.to
      lines.push(`${from} מעביר ל${to} ${s.amount}${symbol}`)
    }
  }

  lines.push('', 'נתראה בערב הבא !')
  return lines.join('\n')
}

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
