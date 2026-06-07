import type { TranslationDict } from './types'
import type { ValidationError } from '@/lib/calculations/validation'

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  )
}

export function translateValidationErrors(
  errors: ValidationError[],
  t: TranslationDict,
  resolvePlayerName: (playerId: string) => string = (id) => id,
): string[] {
  return errors.map((error) => {
    const p = error.params ?? {}
    const name = 'playerId' in p ? resolvePlayerName(String(p.playerId)) : ''

    switch (error.code) {
      case 'missing_cash_out':
        return fill(t.validation.missingCashOut, { name })
      case 'negative_cash_out':
        return fill(t.validation.negativeCashOut, { name })
      case 'buy_in_not_positive':
        return fill(t.validation.buyInNotPositive, { name })
      case 'buy_in_not_in_roster':
        return fill(t.validation.buyInNotInRoster, { name })
      case 'expense_not_positive':
        return fill(t.validation.expenseNotPositive, {
          description: String(p.description ?? ''),
        })
      case 'expense_payer_not_in_game':
        return fill(t.validation.expensePayerNotInGame, {
          description: String(p.description ?? ''),
        })
      case 'expense_splits_mismatch':
        return fill(t.validation.expenseSplitsMismatch, {
          description: String(p.description ?? ''),
          splits: Number(p.splits ?? 0),
          total: Number(p.total ?? 0),
        })
      case 'expense_participant_not_in_game':
        return fill(t.validation.expenseParticipantNotInGame, {
          description: String(p.description ?? ''),
        })
      case 'cash_outs_must_equal_buy_ins':
        return fill(t.validation.cashOutsMustEqualBuyIns, {
          cashOuts: Number(p.cashOuts ?? 0),
          buyIns: Number(p.buyIns ?? 0),
        })
      case 'balances_not_zero':
        return fill(t.validation.balancesNotZero, {
          difference: Number(p.difference ?? 0),
        })
      default:
        return t.common.error
    }
  })
}
