import type { BuyIn } from '@/lib/domain/types'

export function calcTotalBuyIn(buyIns: BuyIn[]): number {
  return buyIns.reduce((sum, b) => sum + b.amount, 0)
}

export function calcPlayerBuyIns(allBuyIns: BuyIn[], playerId: string): number {
  return calcTotalBuyIn(allBuyIns.filter((b) => b.player_id === playerId))
}
