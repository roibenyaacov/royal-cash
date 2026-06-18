import { describe, it, expect } from 'vitest'
import { generateSummaryText, generateWhatsAppSettlementText } from './summary'
import type { GameResult } from '@/lib/domain/types'

const makeResult = (playerId: string, finalBalance: number): GameResult => ({
  id: crypto.randomUUID(),
  game_id: 'g1',
  player_id: playerId,
  total_buy_in: 0,
  cash_out: 0,
  game_net: 0,
  expense_credit: 0,
  expense_debt: 0,
  final_balance: finalBalance,
  created_at: '',
})

const names = new Map([
  ['roi', 'רועי'],
  ['tamar', 'תמר'],
  ['amit', 'עמית'],
])

describe('generateSummaryText', () => {
  it('generates Hebrew summary matching PRD format', () => {
    const results = [
      makeResult('roi', 150),
      makeResult('tamar', -100),
      makeResult('amit', -50),
    ]
    const settlements = [
      { from: 'tamar', to: 'roi', amount: 100 },
      { from: 'amit', to: 'roi', amount: 50 },
    ]

    const text = generateSummaryText(
      { name: 'שישי בערב' },
      results,
      settlements,
      names,
      'he',
    )

    expect(text).toContain('סיכום Royal Cash')
    expect(text).toContain('משחק: שישי בערב')
    expect(text).toContain('רועי: +150')
    expect(text).toContain('תמר: -100')
    expect(text).toContain('עמית: -50')
    expect(text).toContain('קיזוזים:')
    expect(text).toContain('תמר משלם/ת לרועי: 100')
    expect(text).toContain('עמית משלם/ת לרועי: 50')
  })

  it('generates English summary', () => {
    const results = [
      makeResult('roi', 150),
      makeResult('tamar', -100),
    ]
    const settlements = [
      { from: 'tamar', to: 'roi', amount: 100 },
    ]
    const enNames = new Map([
      ['roi', 'Roi'],
      ['tamar', 'Tamar'],
    ])

    const text = generateSummaryText(
      { name: 'Friday Night' },
      results,
      settlements,
      enNames,
      'en',
    )

    expect(text).toContain('Royal Cash Summary')
    expect(text).toContain('Game: Friday Night')
    expect(text).toContain('Roi: +150')
    expect(text).toContain('Tamar → Roi: 100')
  })

  it('formats WhatsApp settlement with RTL game name and closing line', () => {
    const text = generateWhatsAppSettlementText(
      { name: 'שישי בערב', currency: 'ILS' },
      [{ from: 'tamar', to: 'roi', amount: 100 }],
      names,
    )

    expect(text).toContain('תמר מעביר לרועי 100₪')
    expect(text).toContain('\u202Bשישי בערב\u202C')
    expect(text).toContain('נתראה בערב הבא !')
    expect(text).not.toContain('♦')
    expect(text).not.toContain('!נתראה')
  })
})
