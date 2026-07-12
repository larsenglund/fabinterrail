import type { Balance, Expense, Money, Settlement } from '../types';

export function fmtMoney(m?: Money): string {
  if (!m) return '–';
  return `${m.amount.toFixed(2)} ${m.currency}`;
}

/**
 * Compute per-traveler net balances from a list of expenses.
 * Positive net = the traveler is owed money by the group.
 * Expenses in other currencies than `currency` are included at face value —
 * conversion is out of scope for the MVP (tracked in the README roadmap).
 */
export function computeBalances(expenses: Expense[], travelerIds: string[]): Balance[] {
  const net = new Map<string, number>();
  travelerIds.forEach((id) => net.set(id, 0));

  for (const e of expenses) {
    const sharers = e.sharedBy.length > 0 ? e.sharedBy : travelerIds;
    if (sharers.length === 0) continue;
    const share = e.amount.amount / sharers.length;
    net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amount.amount);
    for (const s of sharers) {
      net.set(s, (net.get(s) ?? 0) - share);
    }
  }

  return [...net.entries()].map(([travelerId, n]) => ({ travelerId, net: round2(n) }));
}

/**
 * Greedy debt simplification: produces a small set of "A pays B x" transfers
 * that settles all balances.
 */
export function settle(balances: Balance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b }));
  creditors.sort((a, b) => b.net - a.net);
  debtors.sort((a, b) => a.net - b.net);

  const out: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const give = Math.min(creditors[ci].net, -debtors[di].net);
    out.push({ from: debtors[di].travelerId, to: creditors[ci].travelerId, amount: round2(give) });
    creditors[ci].net = round2(creditors[ci].net - give);
    debtors[di].net = round2(debtors[di].net + give);
    if (creditors[ci].net <= 0.005) ci++;
    if (debtors[di].net >= -0.005) di++;
  }
  return out;
}

export function sumByCategory(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) {
    out[e.category] = round2((out[e.category] ?? 0) + e.amount.amount);
  }
  return out;
}

export function totalSpent(expenses: Expense[]): number {
  return round2(expenses.reduce((acc, e) => acc + e.amount.amount, 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
