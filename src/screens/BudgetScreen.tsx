/**
 * Budget tab: shared expenses, per-traveler balances, minimal settlement
 * plan ("who pays whom") and budget vs. actual follow-up.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Dim, EmptyState, Input, SectionTitle } from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { colors, spacing } from '../theme';
import type { ExpenseCategory } from '../types';
import { fmtDate } from '../utils/date';
import { computeBalances, settle, sumByCategory, totalSpent } from '../utils/money';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'transport', label: '🚆 Transport' },
  { value: 'reservations', label: '🎫 Reservations' },
  { value: 'accommodation', label: '🛏 Accommodation' },
  { value: 'food', label: '🍝 Food' },
  { value: 'activities', label: '🎡 Activities' },
  { value: 'other', label: '📦 Other' },
];

export function BudgetScreen() {
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
      <View style={styles.screen}>
        <EmptyState title="No active trip" hint="Create a trip first in the Trip tab." />
      </View>
    );
  }

  const nameOf = (id: string) => travelers.find((t) => t.id === id)?.name ?? '?';
  const budget = trip.budget?.amount;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.l, paddingBottom: 48 }}>
      {/* Budget vs actual */}
      <Card>
        <SectionTitle>Budget follow-up</SectionTitle>
        <View style={styles.rowBetween}>
          <Body>
            Spent: {spent.toFixed(2)} {trip.currency}
          </Body>
          <Dim>{budget ? `of ${budget.toFixed(2)} ${trip.currency}` : 'no budget set'}</Dim>
        </View>
        {budget ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (spent / budget) * 100)}%`,
                  backgroundColor: spent > budget ? colors.danger : colors.accent,
                },
              ]}
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.s }}>
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
                updateTrip(trip.id, {
                  budget: { amount: parseFloat(budgetInput), currency: trip.currency },
                })
              }
            />
          </View>
        )}
        {Object.entries(byCategory).map(([cat, amount]) => (
          <View key={cat} style={styles.rowBetween}>
            <Dim>{CATEGORIES.find((c) => c.value === cat)?.label ?? cat}</Dim>
            <Dim>
              {amount.toFixed(2)} {trip.currency}
            </Dim>
          </View>
        ))}
      </Card>

      {/* Balances & settlement */}
      {trip.travelerIds.length > 1 && expenses.length > 0 && (
        <Card>
          <SectionTitle>Who owes whom</SectionTitle>
          {balances.map((b) => (
            <View key={b.travelerId} style={styles.rowBetween}>
              <Body>{nameOf(b.travelerId)}</Body>
              <Text style={{ color: b.net >= 0 ? colors.accent : colors.danger, fontWeight: '700' }}>
                {b.net >= 0 ? '+' : ''}
                {b.net.toFixed(2)} {trip.currency}
              </Text>
            </View>
          ))}
          <View style={{ height: spacing.s }} />
          {settlements.length === 0 ? (
            <Dim>All settled 🎉</Dim>
          ) : (
            settlements.map((s, i) => (
              <Body key={i}>
                💸 {nameOf(s.from)} pays {nameOf(s.to)} {s.amount.toFixed(2)} {trip.currency}
              </Body>
            ))
          )}
        </Card>
      )}

      {/* Expenses */}
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
        <Button
          title="+ Add expense"
          onPress={() => setShowForm(true)}
          disabled={trip.travelerIds.length === 0}
        />
      )}
      {trip.travelerIds.length === 0 && (
        <Dim>Add travelers first (Travelers tab) so expenses can be shared.</Dim>
      )}

      {expenses
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => (
          <Card key={e.id}>
            <View style={styles.rowBetween}>
              <Body>{e.title}</Body>
              <Body>
                {e.amount.amount.toFixed(2)} {e.amount.currency}
              </Body>
            </View>
            <Dim>
              {fmtDate(e.date)} · {CATEGORIES.find((c) => c.value === e.category)?.label} · paid by{' '}
              {nameOf(e.paidBy)} · split {e.sharedBy.length} ways
            </Dim>
            <Button title="Remove" kind="ghost" onPress={() => removeExpense(e.id)} />
          </Card>
        ))}
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
  onSave: (e: Parameters<ReturnType<typeof useAppStore.getState>['addExpense']>[0]) => void;
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
    <Card>
      <Input label="What" value={title} onChangeText={setTitle} placeholder="Pizza in Naples" />
      <Input
        label={`Amount (${currency})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="42.50"
      />
      <Dim>CATEGORY</Dim>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            active={category === c.value}
            onPress={() => setCategory(c.value)}
          />
        ))}
      </View>
      <Dim>PAID BY</Dim>
      <View style={styles.chips}>
        {travelerIds.map((id) => (
          <Chip key={id} label={nameOf(id)} active={paidBy === id} onPress={() => setPaidBy(id)} />
        ))}
      </View>
      <Dim>SHARED BY</Dim>
      <View style={styles.chips}>
        {travelerIds.map((id) => (
          <Chip
            key={id}
            label={nameOf(id)}
            active={sharedBy.includes(id)}
            onPress={() => toggleShared(id)}
          />
        ))}
      </View>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.s },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardAlt,
    marginTop: spacing.s,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
});
