import { describe, it, expect } from 'vitest'
import { calcAllPlayerBalances } from './balance'
import { calcSettlements } from './settlement'
import { validateGameForClose } from './validation'
import { calcPlayerBuyIns } from './buy-ins'
import {
  calcExpenseCredit,
  calcExpenseDebtPayable,
} from './expenses'
import type {
  BuyIn,
  CashOut,
  Expense,
  ExpenseParticipant,
} from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// Heavy / edge-case verification of the money math.
//
// Mirrors what closeGameAction does on the server: validate -> compute
// balances -> settle. These tests pile on the things real nights produce —
// dozens of buy-ins (re-buys), mid-game cash-outs, and lots of food expenses
// with both equal and lopsided custom splits — and assert the invariants that
// must always hold, no matter how the table was managed:
//   1. total cash-outs == total buy-ins
//   2. sum of final balances == 0 (zero-sum night)
//   3. money owed to payers == money owed by debtors
//   4. the settlement transfers reconcile every player exactly
// ---------------------------------------------------------------------------

let amountId = 0
const uid = () => `id-${amountId++}`

const makeBuyIn = (playerId: string, amount: number): BuyIn => ({
  id: uid(),
  game_id: 'g1',
  player_id: playerId,
  amount,
  created_by: 'host',
  created_at: '',
  note: null,
})

const makeCashOut = (playerId: string, amount: number): CashOut => ({
  id: uid(),
  game_id: 'g1',
  player_id: playerId,
  amount,
  created_by: 'host',
  created_at: '',
  updated_at: '',
})

const makeExpense = (
  id: string,
  payer: string,
  amount: number,
  splitType: Expense['split_type'],
): Expense => ({
  id,
  game_id: 'g1',
  paid_by_player_id: payer,
  amount,
  description: `exp-${id}`,
  split_type: splitType,
  created_by: 'host',
  created_at: '',
})

const part = (
  expenseId: string,
  playerId: string,
  owed: number,
): ExpenseParticipant => ({
  id: uid(),
  expense_id: expenseId,
  player_id: playerId,
  amount_owed: owed,
})

// Equal split with the remainder loaded onto the first participants (matches
// the app's behaviour: 100 / 3 -> 34, 33, 33).
function splitEqually(amount: number, ids: string[]): number[] {
  const base = Math.floor(amount / ids.length)
  let remainder = amount - base * ids.length
  return ids.map(() => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return base + extra
  })
}

// Assert the full pipeline holds for a balanced game.
function assertReconciles(
  playerIds: string[],
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  expenses: Expense[],
  participantsByExpense: Map<string, ExpenseParticipant[]>,
) {
  const validation = validateGameForClose(
    playerIds,
    buyIns,
    cashOuts,
    expenses,
    participantsByExpense,
  )
  expect(validation.errors).toEqual([])
  expect(validation.valid).toBe(true)

  const results = calcAllPlayerBalances(
    playerIds,
    buyIns,
    cashOuts,
    expenses,
    participantsByExpense,
    'g1',
  )

  // (1) cash-outs == buy-ins
  const totalBuyIn = buyIns.reduce((s, b) => s + b.amount, 0)
  const totalCashOut = cashOuts.reduce((s, c) => s + c.amount, 0)
  expect(totalCashOut).toBe(totalBuyIn)

  // (2) zero-sum
  const totalBalance = results.reduce((s, r) => s + r.final_balance, 0)
  expect(totalBalance).toBe(0)

  // (3) credit owed to payers == debt owed by debtors
  const activeSet = new Set(playerIds)
  let totalCredit = 0
  let totalDebtPayable = 0
  for (const pid of playerIds) {
    totalCredit += calcExpenseCredit(
      expenses,
      participantsByExpense,
      pid,
      activeSet,
    )
    totalDebtPayable += calcExpenseDebtPayable(
      expenses,
      participantsByExpense,
      pid,
      activeSet,
    )
  }
  expect(totalCredit).toBe(totalDebtPayable)

  // (4) settlements reconcile every player exactly
  const settlements = calcSettlements(
    results.map((r) => ({ playerId: r.player_id, amount: r.final_balance })),
  )
  const net = new Map(playerIds.map((id) => [id, 0]))
  for (const tr of settlements) {
    expect(tr.amount).toBeGreaterThan(0)
    net.set(tr.from, (net.get(tr.from) ?? 0) - tr.amount)
    net.set(tr.to, (net.get(tr.to) ?? 0) + tr.amount)
  }
  for (const r of results) {
    // A debtor pays out exactly their negative balance; a creditor receives
    // exactly their positive balance.
    expect(net.get(r.player_id)).toBe(r.final_balance)
  }

  return results
}

describe('heavy game: many buy-ins, mid-game cash-outs, lots of food', () => {
  it('reconciles a 9-player night with dozens of buy-ins and 12 expenses', () => {
    const players = Array.from({ length: 9 }, (_, i) => `p${i}`)

    // Each player re-bought a different number of times, mixing the default
    // 50 buy-in with custom amounts.
    const buyIns: BuyIn[] = []
    const reBuys: Record<string, number[]> = {
      p0: [50, 50, 50],
      p1: [50, 100],
      p2: [50],
      p3: [50, 50, 50, 50, 73], // custom top-up
      p4: [50, 50],
      p5: [50, 200, 50],
      p6: [50],
      p7: [50, 50, 50, 50, 50, 50], // grinder, six buy-ins
      p8: [120], // joined with a custom stack
    }
    for (const [pid, amounts] of Object.entries(reBuys)) {
      for (const a of amounts) buyIns.push(makeBuyIn(pid, a))
    }

    const totalPot = buyIns.reduce((s, b) => s + b.amount, 0)

    // Cash-outs: start everyone at their buy-in, then move chips around so the
    // night has real winners and losers while staying a perfect zero-sum.
    const buyInByPlayer = new Map(
      players.map((p) => [p, calcPlayerBuyIns(buyIns, p)]),
    )
    const cashOutAmt = new Map(buyInByPlayer)
    const move = (from: string, to: string, amt: number) => {
      cashOutAmt.set(from, (cashOutAmt.get(from) ?? 0) - amt)
      cashOutAmt.set(to, (cashOutAmt.get(to) ?? 0) + amt)
    }
    move('p7', 'p5', 180)
    move('p3', 'p0', 120)
    move('p1', 'p5', 40)
    move('p4', 'p8', 90)
    move('p2', 'p0', 25)
    const cashOuts = players.map((p) => makeCashOut(p, cashOutAmt.get(p) ?? 0))
    // sanity: no negative cash-outs were produced
    for (const c of cashOuts) expect(c.amount).toBeGreaterThanOrEqual(0)

    // 12 food expenses, equal + custom splits, various payers and subsets.
    const expenses: Expense[] = []
    const map = new Map<string, ExpenseParticipant[]>()
    const addEqual = (id: string, payer: string, amount: number, ids: string[]) => {
      const exp = makeExpense(id, payer, amount, 'equal_split')
      const shares = splitEqually(amount, ids)
      expenses.push(exp)
      map.set(id, ids.map((pid, i) => part(id, pid, shares[i])))
    }
    const addCustom = (
      id: string,
      payer: string,
      shares: [string, number][],
    ) => {
      const amount = shares.reduce((s, [, v]) => s + v, 0)
      const exp = makeExpense(id, payer, amount, 'custom_split')
      expenses.push(exp)
      map.set(id, shares.map(([pid, v]) => part(id, pid, v)))
    }

    addEqual('e1', 'p0', 100, ['p0', 'p1', 'p2'])
    addEqual('e2', 'p3', 90, ['p3', 'p4', 'p5', 'p6'])
    addEqual('e3', 'p7', 70, ['p7', 'p8'])
    addEqual('e4', 'p1', 55, ['p0', 'p1', 'p2', 'p3', 'p4']) // payer also eats
    addCustom('e5', 'p2', [['p2', 0], ['p5', 40], ['p6', 60]]) // payer ate nothing
    addCustom('e6', 'p8', [['p8', 30], ['p0', 30], ['p7', 90]])
    addEqual('e7', 'p4', 33, ['p4', 'p5', 'p6']) // 11 each
    addEqual('e8', 'p5', 101, ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']) // remainder
    addCustom('e9', 'p6', [['p6', 12], ['p7', 13], ['p8', 5]])
    addEqual('e10', 'p0', 200, players) // whole table
    addCustom('e11', 'p3', [['p1', 25], ['p2', 25]]) // payer not a participant
    addEqual('e12', 'p7', 47, ['p7', 'p8', 'p0'])

    const results = assertReconciles(players, buyIns, cashOuts, expenses, map)

    // Spot-check the pot is what we expect and the grinder really bought in 6x.
    expect(calcPlayerBuyIns(buyIns, 'p7')).toBe(300)
    expect(totalPot).toBe(
      results.reduce((s, r) => s + r.total_buy_in, 0),
    )
  })

  it('handles a single player with 60 buy-ins without drift', () => {
    const buyIns = Array.from({ length: 60 }, () => makeBuyIn('solo', 50))
    expect(calcPlayerBuyIns(buyIns, 'solo')).toBe(3000)
  })

  it('an expense the payer ate alone gives no credit and no debt to others', () => {
    const players = ['a', 'b']
    const exp = makeExpense('x', 'a', 80, 'custom_split')
    const map = new Map([['x', [part('x', 'a', 80)]]])
    const credit = calcExpenseCredit([exp], map, 'a', new Set(players))
    const bDebt = calcExpenseDebtPayable([exp], map, 'b', new Set(players))
    expect(credit).toBe(0)
    expect(bDebt).toBe(0)
  })

  it('mid-game cash-out (player left early) still reconciles with expenses', () => {
    const players = ['x', 'y', 'z']
    const buyIns = [
      makeBuyIn('x', 100),
      makeBuyIn('y', 100),
      makeBuyIn('y', 50),
      makeBuyIn('z', 100),
    ]
    // y cashed out mid-game with 0 (busted), x and z split the chips.
    const cashOuts = [
      makeCashOut('x', 220),
      makeCashOut('y', 0),
      makeCashOut('z', 130),
    ]
    const exp = makeExpense('f', 'z', 90, 'equal_split')
    const shares = splitEqually(90, players)
    const map = new Map([
      ['f', players.map((p, i) => part('f', p, shares[i]))],
    ])
    assertReconciles(players, buyIns, cashOuts, [exp], map)
  })
})

// A deterministic fuzz: many randomly-shaped balanced games. If any invariant
// can be broken by an odd mix of buy-ins / splits, repeated trials will catch
// it. Seeded LCG so failures are reproducible.
describe('fuzz: balanced random games stay reconciled', () => {
  it('holds across 200 randomized games', () => {
    let seed = 987654321
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const randInt = (min: number, max: number) =>
      min + Math.floor(rand() * (max - min + 1))

    for (let game = 0; game < 200; game++) {
      const n = randInt(2, 8)
      const players = Array.from({ length: n }, (_, i) => `g${game}p${i}`)

      // Buy-ins: each player buys in 1..6 times, amounts in {25,50,100} + customs.
      const buyIns: BuyIn[] = []
      for (const p of players) {
        const times = randInt(1, 6)
        for (let i = 0; i < times; i++) {
          const pick = randInt(0, 3)
          const amt = pick === 3 ? randInt(20, 250) : [25, 50, 100][pick]
          buyIns.push(makeBuyIn(p, amt))
        }
      }

      // Balanced cash-outs via chip transfers.
      const cashOutAmt = new Map(
        players.map((p) => [p, calcPlayerBuyIns(buyIns, p)]),
      )
      const moves = randInt(0, n * 2)
      for (let m = 0; m < moves; m++) {
        const from = players[randInt(0, n - 1)]
        const to = players[randInt(0, n - 1)]
        if (from === to) continue
        const avail = cashOutAmt.get(from) ?? 0
        if (avail <= 0) continue
        const amt = randInt(1, avail)
        cashOutAmt.set(from, avail - amt)
        cashOutAmt.set(to, (cashOutAmt.get(to) ?? 0) + amt)
      }
      const cashOuts = players.map((p) => makeCashOut(p, cashOutAmt.get(p) ?? 0))

      // Random food expenses.
      const expenses: Expense[] = []
      const map = new Map<string, ExpenseParticipant[]>()
      const expCount = randInt(0, 10)
      for (let e = 0; e < expCount; e++) {
        const id = `g${game}e${e}`
        const payer = players[randInt(0, n - 1)]
        // participant subset of size 1..n
        const subset = players.filter(() => rand() < 0.6)
        if (subset.length === 0) subset.push(players[randInt(0, n - 1)])
        const amount = randInt(10, 400)
        if (rand() < 0.5) {
          // equal split
          const shares = splitEqually(amount, subset)
          expenses.push(makeExpense(id, payer, amount, 'equal_split'))
          map.set(id, subset.map((pid, i) => part(id, pid, shares[i])))
        } else {
          // custom split: random shares summing exactly to amount
          const shares = splitEqually(amount, subset) // start equal
          // shuffle some amount between two participants to make it lopsided
          if (subset.length >= 2) {
            const i = randInt(0, subset.length - 1)
            let j = randInt(0, subset.length - 1)
            if (j === i) j = (j + 1) % subset.length
            const delta = randInt(0, shares[i])
            shares[i] -= delta
            shares[j] += delta
          }
          expenses.push(makeExpense(id, payer, amount, 'custom_split'))
          map.set(id, subset.map((pid, k) => part(id, pid, shares[k])))
        }
      }

      assertReconciles(players, buyIns, cashOuts, expenses, map)
    }
  })
})
