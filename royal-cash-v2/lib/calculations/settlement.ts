export type BalanceEntry = {
  playerId: string
  amount: number
}

export type SettlementTransfer = {
  from: string
  to: string
  amount: number
}

/**
 * Greedy settlement algorithm: minimizes the number of transfers
 * by matching largest debtor to largest creditor iteratively.
 */
export function calcSettlements(
  balances: BalanceEntry[],
): SettlementTransfer[] {
  const debtors: BalanceEntry[] = []
  const creditors: BalanceEntry[] = []

  for (const b of balances) {
    if (b.amount < 0) {
      debtors.push({ playerId: b.playerId, amount: Math.abs(b.amount) })
    } else if (b.amount > 0) {
      creditors.push({ playerId: b.playerId, amount: b.amount })
    }
  }

  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transfers: SettlementTransfer[] = []
  let di = 0
  let ci = 0

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di]
    const creditor = creditors[ci]
    const transferAmount = Math.min(debtor.amount, creditor.amount)

    if (transferAmount > 0) {
      transfers.push({
        from: debtor.playerId,
        to: creditor.playerId,
        amount: transferAmount,
      })
    }

    debtor.amount -= transferAmount
    creditor.amount -= transferAmount

    if (debtor.amount === 0) di++
    if (creditor.amount === 0) ci++
  }

  return transfers
}
