// ==========================================
// Royal Cash - Calculation Utilities
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { Transaction, PlayerBalance } from '../types';

/**
 * Transaction Optimization Algorithm (Greedy)
 * Minimizes the number of transactions by matching largest debtors with largest creditors
 *
 * Copied AS-IS from original optimizeTransactions() function
 */
export function optimizeTransactions(
  playerBalances: PlayerBalance[],
  epsilon: number = 0.5
): Transaction[] {
  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors = playerBalances
    .filter((p) => p.finalBalance < -epsilon)
    .map((p) => ({ ...p, remaining: Math.abs(p.finalBalance) }))
    .sort((a, b) => b.remaining - a.remaining); // Sort descending by debt size

  const creditors = playerBalances
    .filter((p) => p.finalBalance > epsilon)
    .map((p) => ({ ...p, remaining: p.finalBalance }))
    .sort((a, b) => b.remaining - a.remaining); // Sort descending by credit size

  const transactions: Transaction[] = [];
  let debtorIdx = 0;
  let creditorIdx = 0;

  // Greedy matching: Pair largest debtor with largest creditor
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    // Transaction amount = minimum of debt and credit
    const amount = Math.min(debtor.remaining, creditor.remaining);

    transactions.push({
      from: debtor.id,
      fromName: debtor.name,
      fromPhone: debtor.phone,
      to: creditor.id,
      toName: creditor.name,
      toPhone: creditor.phone,
      amount: Math.round(amount), // Round to whole shekel
    });

    console.log(`   💸 ${debtor.name} → ${creditor.name}: ${Math.round(amount)}₪`);

    // Update remaining balances
    debtor.remaining -= amount;
    creditor.remaining -= amount;

    // Move to next debtor/creditor if fully settled
    if (debtor.remaining < epsilon) debtorIdx++;
    if (creditor.remaining < epsilon) creditorIdx++;
  }

  return transactions;
}

/**
 * Calculate player balances for settlement
 * Copied from original calcResult() function logic
 */
export function calculatePlayerBalances(
  players: Array<{
    id: string;
    userId: string;
    name: string;
    phone?: string | null;
    rebuys: number;
    foodCredit: number;
    foodDebt: number;
    cashOut: number;
  }>,
  buyIn: number
): PlayerBalance[] {
  return players.map((p) => {
    // Game calculations
    const buyInTotal = (p.rebuys || 1) * buyIn;
    const gameNet = p.cashOut - buyInTotal;

    // Expense calculations
    const expenseCredits = p.foodCredit || 0; // Money paid for others
    const expenseDebits = p.foodDebt || 0; // Money owed for consumption

    // Final balance = Game result + Expense adjustments
    const finalBalance = gameNet + expenseCredits - expenseDebits;

    console.log(`\n💰 ${p.name}:`);
    console.log(
      `   🎰 Game: Cash Out ${p.cashOut}₪ - Buy In ${buyInTotal}₪ = ${gameNet >= 0 ? '+' : ''}${gameNet}₪`
    );
    console.log(`   🍕 Expenses: Credits +${expenseCredits}₪, Debits -${expenseDebits}₪`);
    console.log(`   📊 Final Balance: ${finalBalance >= 0 ? '+' : ''}${finalBalance}₪`);

    return {
      id: p.id,
      userId: p.userId,
      name: p.name,
      phone: p.phone,
      cashOut: p.cashOut,
      buyIn: buyInTotal,
      gameNet,
      expenseCredits,
      expenseDebits,
      finalBalance,
    };
  });
}

/**
 * Validate that balances sum to zero (within epsilon)
 */
export function validateBalances(playerBalances: PlayerBalance[], epsilon: number = 0.5): boolean {
  const totalBalance = playerBalances.reduce((sum, p) => sum + p.finalBalance, 0);
  console.log(`\n✅ Validation: Total balance = ${totalBalance.toFixed(2)}₪`);

  if (Math.abs(totalBalance) > epsilon) {
    console.warn(`⚠️ Balance discrepancy detected: ${totalBalance.toFixed(2)}₪`);
    return false;
  }

  return true;
}

/**
 * Calculate total pot size
 */
export function calculatePot(players: Array<{ rebuys: number }>, buyIn: number): number {
  return players.reduce((sum, p) => sum + (p.rebuys || 1) * buyIn, 0);
}
