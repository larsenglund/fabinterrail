import { describe, expect, it } from 'vitest';

import type { Expense } from '../types';
import { computeBalances, settle, sumByCategory, totalSpent } from './money';

const exp = (partial: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'sharedBy'>): Expense => ({
  id: 'e1',
  tripId: 't1',
  title: 'test',
  category: 'food',
  date: '2026-07-20',
  ...partial,
});

describe('computeBalances', () => {
  it('splits an expense equally among sharers', () => {
    const balances = computeBalances(
      [exp({ amount: { amount: 90, currency: 'EUR' }, paidBy: 'a', sharedBy: ['a', 'b', 'c'] })],
      ['a', 'b', 'c'],
    );
    expect(balances).toEqual([
      { travelerId: 'a', net: 60 },
      { travelerId: 'b', net: -30 },
      { travelerId: 'c', net: -30 },
    ]);
  });

  it('always nets to (approximately) zero', () => {
    const balances = computeBalances(
      [
        exp({ amount: { amount: 100, currency: 'EUR' }, paidBy: 'a', sharedBy: ['a', 'b', 'c'] }),
        exp({ amount: { amount: 47.5, currency: 'EUR' }, paidBy: 'b', sharedBy: ['b', 'c'] }),
        exp({ amount: { amount: 13.37, currency: 'EUR' }, paidBy: 'c', sharedBy: ['a'] }),
      ],
      ['a', 'b', 'c'],
    );
    const sum = balances.reduce((acc, b) => acc + b.net, 0);
    expect(Math.abs(sum)).toBeLessThan(0.02);
  });

  it('treats an empty sharedBy as split among everyone', () => {
    const balances = computeBalances(
      [exp({ amount: { amount: 30, currency: 'EUR' }, paidBy: 'a', sharedBy: [] })],
      ['a', 'b', 'c'],
    );
    expect(balances.find((b) => b.travelerId === 'a')?.net).toBe(20);
  });

  it('handles a payer who is not among the sharers', () => {
    const balances = computeBalances(
      [exp({ amount: { amount: 40, currency: 'EUR' }, paidBy: 'a', sharedBy: ['b', 'c'] })],
      ['a', 'b', 'c'],
    );
    expect(balances).toEqual([
      { travelerId: 'a', net: 40 },
      { travelerId: 'b', net: -20 },
      { travelerId: 'c', net: -20 },
    ]);
  });
});

describe('settle', () => {
  it('produces transfers that zero out all balances', () => {
    const balances = [
      { travelerId: 'a', net: 64.1 },
      { travelerId: 'b', net: -21.3 },
      { travelerId: 'c', net: -42.8 },
    ];
    const s = settle(balances);
    expect(s).toEqual([
      { from: 'c', to: 'a', amount: 42.8 },
      { from: 'b', to: 'a', amount: 21.3 },
    ]);
  });

  it('needs at most n-1 transfers', () => {
    const balances = [
      { travelerId: 'a', net: 50 },
      { travelerId: 'b', net: 10 },
      { travelerId: 'c', net: -25 },
      { travelerId: 'd', net: -35 },
    ];
    expect(settle(balances).length).toBeLessThanOrEqual(3);
  });

  it('returns nothing when already settled', () => {
    expect(settle([{ travelerId: 'a', net: 0 }])).toEqual([]);
  });
});

describe('sums', () => {
  it('totals and groups by category', () => {
    const expenses = [
      exp({ amount: { amount: 10, currency: 'EUR' }, paidBy: 'a', sharedBy: ['a'], category: 'food' }),
      exp({ amount: { amount: 5.5, currency: 'EUR' }, paidBy: 'a', sharedBy: ['a'], category: 'food' }),
      exp({ amount: { amount: 30, currency: 'EUR' }, paidBy: 'a', sharedBy: ['a'], category: 'transport' }),
    ];
    expect(totalSpent(expenses)).toBe(45.5);
    expect(sumByCategory(expenses)).toEqual({ food: 15.5, transport: 30 });
  });
});
