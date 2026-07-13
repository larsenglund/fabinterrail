/**
 * Budget: money set like times. One hero number answers "are we on budget?";
 * categories and balances answer "where did it go" and "who owes whom".
 * Settlement is a short list of instructions.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Chip,
  ChipRow,
  Dim,
  EmptyState,
  Header,
  Input,
  Label,
  ListRow,
  SectionTitle,
  TextAction,
} from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { radii, spacing, tabular, usePalette } from '../theme';
import { type Expense, type ExpenseCategory } from '../types';
import { dayjs, fmtDate } from '../utils/date';
import { computeBalances, settle, sumByCategory, totalSpent } from '../utils/money';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'accommodation', label: 'Sleep' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'activities', label: 'Fun' },
  { value: 'reservations', label: 'Reservations' },
  { value: 'other', label: 'Other' },
];

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function BudgetScreen() {
  const p = usePalette();
  const trip = useActiveTrip();
  const travelers = useAppStore((s) => s.travelers);
  const allExpenses = useAppStore((s) => s.expenses);
  const { addExpense, removeExpense, updateTrip } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const expenses = useMemo(
    () => (trip ? allExpenses.filter((e) => e.tripId === trip.id) : []),
    [allExpenses, trip],
  );
  const balances = useMemo(
    () => (trip ? computeBalances(expenses, trip.travelerIds) : []),
    [expenses, trip],
  );
  const settlements = useMemo(() => settle(balances), [balances]);
  const byCategory = useMemo(() => sumByCategory(expenses), [expenses]);
  const spent = totalSpent(expenses);

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <EmptyState title="No active trip" hint="Create a trip first in the Trip tab." />
      </View>
    );
  }

  const nameOf = (id: string) => travelers.find((t) => t.id === id)?.name ?? '?';
  const budget = trip.budget?.amount;
  const over = budget != null && spent > budget;
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  // days elapsed vs total, for "on pace"
  const first = trip.stops[0]?.arrival;
  const last = trip.stops[trip.stops.length - 1]?.departure;
  const totalDays = first && last ? dayjs(last).diff(dayjs(first), 'day') + 1 : 0;
  const dayNo = first ? dayjs().startOf('day').diff(dayjs(first).startOf('day'), 'day') + 1 : 0;
  const maxCat = Math.max(1, ...Object.values(byCategory));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={styles.content}>
      <Header kicker={`${trip.name} · group total`} title="Budget" />

      <View style={{ marginTop: spacing.s }}>
        <Text style={[styles.hero, tabular, { color: p.ink }]}>
          {formatAmount(spent)} {trip.currency === 'EUR' ? '€' : trip.currency}
          {budget != null && (
            <Text style={[styles.heroOf, { color: p.muted }]}>
              {'  '}of {formatAmount(budget)} {trip.currency === 'EUR' ? '€' : trip.currency}
            </Text>
          )}
        </Text>
        {budget != null ? (
          <>
            <Dim style={tabular}>
              {dayNo >= 1 && totalDays > 0 ? `Day ${Math.min(dayNo, totalDays)} of ${totalDays} · ` : ''}
              <Text style={{ color: over ? p.danger : p.good, fontWeight: '700' }}>
                {over ? 'over budget' : 'on pace'} · {pct} %
              </Text>
            </Dim>
            <View style={[styles.progTrack, { backgroundColor: p.field }]}>
              <View
                style={[styles.progFill, { width: `${pct}%`, backgroundColor: over ? p.danger : p.good }]}
              />
            </View>
          </>
        ) : (
          <View style={{ marginTop: spacing.m }}>
            <Input
              label={`Set trip budget (${trip.currency})`}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="2500"
            />
            <Button
              title="Set budget"
              disabled={!parseFloat(budgetInput)}
              onPress={() =>
                updateTrip(trip.id, { budget: { amount: parseFloat(budgetInput), currency: trip.currency } })
              }
            />
          </View>
        )}
      </View>

      {expenses.length > 0 && (
        <>
          <SectionTitle>By category</SectionTitle>
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={[styles.catLabel, { color: p.ink }]}>{catLabel(cat)}</Text>
                <View style={styles.catBarTrack}>
                  <View
                    style={[
                      styles.catBar,
                      { width: `${Math.round((amount / maxCat) * 100)}%`, backgroundColor: p.slate },
                    ]}
                  />
                </View>
                <Text style={[styles.catVal, tabular, { color: p.ink }]}>{formatAmount(amount)} €</Text>
              </View>
            ))}
        </>
      )}

      {trip.travelerIds.length > 1 && expenses.length > 0 && (
        <>
          <SectionTitle>Balances</SectionTitle>
          {balances.map((b, i) => (
            <ListRow
              key={b.travelerId}
              last={i === balances.length - 1}
              aside={
                <Text style={[styles.balAmt, tabular, { color: b.net >= 0 ? p.good : p.danger }]}>
                  {b.net >= 0 ? '+' : '−'}
                  {formatAmount(Math.abs(b.net))} €
                </Text>
              }
            >
              <Text style={[styles.balName, { color: p.ink }]}>{nameOf(b.travelerId)}</Text>
            </ListRow>
          ))}

          <SectionTitle>To settle</SectionTitle>
          {settlements.length === 0 ? (
            <Dim>All settled.</Dim>
          ) : (
            settlements.map((s, i) => (
              <ListRow
                key={i}
                last={i === settlements.length - 1}
                aside={<Text style={[styles.balAmt, tabular, { color: p.ink }]}>{formatAmount(s.amount)} €</Text>}
              >
                <Text style={{ color: p.ink, fontSize: 14 }}>
                  {nameOf(s.from)} <Text style={{ color: p.muted }}>pays</Text> {nameOf(s.to)}
                </Text>
              </ListRow>
            ))
          )}
        </>
      )}

      <SectionTitle>Expenses</SectionTitle>
      {showForm ? (
        <ExpenseForm
          tripId={trip.id}
          currency={trip.currency}
          travelerIds={trip.travelerIds}
          nameOf={nameOf}
          onSave={(e) => {
            addExpense(e);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Button title="+ Add expense" onPress={() => setShowForm(true)} disabled={trip.travelerIds.length === 0} />
      )}
      {trip.travelerIds.length === 0 && <Dim>Add travelers first (People tab) so expenses can be shared.</Dim>}

      {expenses
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e, i, arr) => (
          <ListRow
            key={e.id}
            last={i === arr.length - 1}
            aside={
              <>
                <Text style={[styles.balAmt, tabular, { color: p.ink }]}>
                  {formatAmount(e.amount.amount)} {e.amount.currency === 'EUR' ? '€' : e.amount.currency}
                </Text>
                <TextAction title="Remove" onPress={() => removeExpense(e.id)} />
              </>
            }
          >
            <Text style={{ color: p.ink, fontSize: 15, fontWeight: '600' }}>{e.title}</Text>
            <Dim style={tabular}>
              {fmtDate(e.date)} · {catLabel(e.category)} · {nameOf(e.paidBy)} paid · split{' '}
              {e.sharedBy.length} ways
            </Dim>
          </ListRow>
        ))}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

function ExpenseForm({
  tripId,
  currency,
  travelerIds,
  nameOf,
  onSave,
  onCancel,
}: {
  tripId: string;
  currency: string;
  travelerIds: string[];
  nameOf: (id: string) => string;
  onSave: (e: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(travelerIds[0]);
  const [sharedBy, setSharedBy] = useState<string[]>(travelerIds);

  const toggleShared = (id: string) =>
    setSharedBy((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = title.trim() && parseFloat(amount) > 0 && paidBy && sharedBy.length > 0;

  return (
    <View>
      <Input label="What" value={title} onChangeText={setTitle} placeholder="Pizza in Naples" />
      <Input
        label={`Amount (${currency})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="42.50"
      />
      <Label>Category</Label>
      <ChipRow>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
        ))}
      </ChipRow>
      <Label>Paid by</Label>
      <ChipRow>
        {travelerIds.map((id) => (
          <Chip key={id} label={nameOf(id)} active={paidBy === id} onPress={() => setPaidBy(id)} />
        ))}
      </ChipRow>
      <Label>Shared by</Label>
      <ChipRow>
        {travelerIds.map((id) => (
          <Chip key={id} label={nameOf(id)} active={sharedBy.includes(id)} onPress={() => toggleShared(id)} />
        ))}
      </ChipRow>
      <Button
        title="Save expense"
        disabled={!valid}
        onPress={() =>
          onSave({
            tripId,
            title: title.trim(),
            category,
            amount: { amount: parseFloat(amount), currency },
            paidBy,
            sharedBy,
            date: new Date().toISOString().slice(0, 10),
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={onCancel} />
    </View>
  );
}

function formatAmount(n: number): string {
  // 1 284 — thin-space thousands, no decimals for round numbers
  const rounded = Math.round(n * 100) / 100;
  const [int, dec] = rounded.toFixed(2).split('.');
  const spaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec === '00' ? spaced : `${spaced}.${dec}`;
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: 48 },
  hero: { fontSize: 42, fontWeight: '800', letterSpacing: -1, lineHeight: 48 },
  heroOf: { fontSize: 16, fontWeight: '600', letterSpacing: 0 },
  progTrack: { height: 6, borderRadius: 3, marginTop: spacing.m, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: 7 },
  catLabel: { width: 96, fontSize: 13, fontWeight: '600' },
  catBarTrack: { flex: 1 },
  catBar: { height: 10, borderRadius: radii.s - 2 },
  catVal: { minWidth: 64, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  balName: { fontSize: 15, fontWeight: '700' },
  balAmt: { fontSize: 15, fontWeight: '800' },
});
