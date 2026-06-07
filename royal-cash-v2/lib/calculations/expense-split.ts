import type { ExpenseSplitType } from '@/lib/domain/types'

export type ExpenseParticipantInput = {
  playerId: string
  amountOwed: number
}

export type BuildExpenseParticipantsParams = {
  splitType: ExpenseSplitType
  amount: number
  participantIds: string[]
  customAmounts?: Record<string, number>
  personalOwerId?: string
}

export type BuildExpenseParticipantsResult =
  | { ok: true; participants: ExpenseParticipantInput[] }
  | { ok: false; error: 'split_sum_mismatch' | 'missing_personal_ower' | 'no_participants' }

export function buildExpenseParticipants(
  params: BuildExpenseParticipantsParams,
): BuildExpenseParticipantsResult {
  const { splitType, amount, participantIds } = params

  if (participantIds.length === 0 && splitType !== 'personal') {
    return { ok: false, error: 'no_participants' }
  }

  if (splitType === 'equal_split') {
    const base = Math.floor(amount / participantIds.length)
    const remainder = amount - base * participantIds.length
    return {
      ok: true,
      participants: participantIds.map((id, i) => ({
        playerId: id,
        amountOwed: base + (i < remainder ? 1 : 0),
      })),
    }
  }

  if (splitType === 'custom_split') {
    const customAmounts = params.customAmounts ?? {}
    const participants = participantIds.map((id) => ({
      playerId: id,
      amountOwed: customAmounts[id] ?? 0,
    }))
    const sum = participants.reduce((s, p) => s + p.amountOwed, 0)
    if (sum !== amount) {
      return { ok: false, error: 'split_sum_mismatch' }
    }
    return { ok: true, participants }
  }

  if (splitType === 'personal') {
    const owerId = params.personalOwerId
    if (!owerId) {
      return { ok: false, error: 'missing_personal_ower' }
    }
    return {
      ok: true,
      participants: [{ playerId: owerId, amountOwed: amount }],
    }
  }

  return { ok: false, error: 'no_participants' }
}

export function sumCustomAmounts(
  participantIds: string[],
  customAmounts: Record<string, string>,
): number {
  return participantIds.reduce(
    (sum, id) => sum + (parseInt(customAmounts[id] ?? '0', 10) || 0),
    0,
  )
}
