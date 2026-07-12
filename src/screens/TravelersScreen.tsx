/**
 * Travelers tab: the group's people, their personal details (stored only
 * on-device), Interrail pass numbers and tickets/reservations.
 */

import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Dim, EmptyState, Input, SectionTitle } from '../components/ui';
import { useAppStore } from '../store/appStore';
import { colors, spacing } from '../theme';
import type { PassType, RailPass, Traveler } from '../types';

const PASS_TYPES: { value: PassType; label: string }[] = [
  { value: 'interrail-global', label: 'Interrail Global' },
  { value: 'interrail-one-country', label: 'Interrail One Country' },
  { value: 'eurail-global', label: 'Eurail Global' },
  { value: 'other', label: 'Other' },
];

export function TravelersScreen() {
  const travelers = useAppStore((s) => s.travelers);
  const { addTraveler, removeTraveler } = useAppStore();
  const [name, setName] = useState('');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.l, paddingBottom: 48 }}>
      <Card>
        <SectionTitle>Add traveler</SectionTitle>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Lars" />
        <Button
          title="Add"
          disabled={!name.trim()}
          onPress={() => {
            addTraveler(name.trim());
            setName('');
          }}
        />
      </Card>

      {travelers.length === 0 && (
        <EmptyState
          title="No travelers yet"
          hint="Add everyone in your group. Personal details and pass numbers are stored only on this device."
        />
      )}

      {travelers.map((t) => (
        <TravelerCard key={t.id} traveler={t} onRemove={() => confirmRemove(t, removeTraveler)} />
      ))}
    </ScrollView>
  );
}

function confirmRemove(t: Traveler, removeTraveler: (id: string) => void) {
  Alert.alert('Remove traveler?', `${t.name} will be removed from all trips.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => removeTraveler(t.id) },
  ]);
}

function TravelerCard({ traveler, onRemove }: { traveler: Traveler; onRemove: () => void }) {
  const { updateTraveler, addPass, removePass } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.nameRow}>
          <View style={[styles.avatar, { backgroundColor: traveler.color }]}>
            <Text style={styles.avatarText}>{traveler.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{traveler.name}</Text>
        </View>
        <Button title={editing ? 'Done' : 'Edit'} kind="ghost" onPress={() => setEditing(!editing)} />
      </View>

      {editing ? (
        <View style={{ marginTop: spacing.m }}>
          <Input
            label="Passport number"
            value={traveler.passportNumber ?? ''}
            onChangeText={(v) => updateTraveler(traveler.id, { passportNumber: v })}
            autoCapitalize="characters"
          />
          <Input
            label="Date of birth (YYYY-MM-DD)"
            value={traveler.dateOfBirth ?? ''}
            onChangeText={(v) => updateTraveler(traveler.id, { dateOfBirth: v })}
            autoCapitalize="none"
          />
          <Input
            label="Phone"
            value={traveler.phone ?? ''}
            onChangeText={(v) => updateTraveler(traveler.id, { phone: v })}
            keyboardType="phone-pad"
          />
          <Input
            label="Emergency contact"
            value={traveler.emergencyContact ?? ''}
            onChangeText={(v) => updateTraveler(traveler.id, { emergencyContact: v })}
          />
          <Button title="Remove traveler" kind="danger" onPress={onRemove} />
        </View>
      ) : (
        <View style={{ marginTop: spacing.s }}>
          {traveler.passportNumber ? <Dim>Passport: {traveler.passportNumber}</Dim> : null}
          {traveler.phone ? <Dim>Phone: {traveler.phone}</Dim> : null}
        </View>
      )}

      <View style={{ marginTop: spacing.m }}>
        <Dim>PASSES</Dim>
        {traveler.passes.length === 0 && <Dim>No pass stored yet.</Dim>}
        {traveler.passes.map((p) => (
          <View key={p.id} style={styles.passRow}>
            <Body>
              🎫 {PASS_TYPES.find((pt) => pt.value === p.type)?.label ?? p.type} · {p.validity} ·{' '}
              {p.travelClass}nd class
            </Body>
            <Dim>
              № {p.passNumber} · {p.format}
            </Dim>
            <Button title="Remove pass" kind="ghost" onPress={() => removePass(traveler.id, p.id)} />
          </View>
        ))}
        {showPassForm ? (
          <PassForm
            onSave={(p) => {
              addPass(traveler.id, p);
              setShowPassForm(false);
            }}
            onCancel={() => setShowPassForm(false)}
          />
        ) : (
          <Button title="+ Add pass" kind="ghost" onPress={() => setShowPassForm(true)} />
        )}
      </View>
    </Card>
  );
}

function PassForm({
  onSave,
  onCancel,
}: {
  onSave: (p: Omit<RailPass, 'id'>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<PassType>('interrail-global');
  const [passNumber, setPassNumber] = useState('');
  const [validity, setValidity] = useState('');

  return (
    <View style={{ marginTop: spacing.m }}>
      <View style={styles.chips}>
        {PASS_TYPES.map((pt) => (
          <Chip
            key={pt.value}
            label={pt.label}
            active={type === pt.value}
            onPress={() => setType(pt.value)}
          />
        ))}
      </View>
      <Input
        label="Pass number"
        value={passNumber}
        onChangeText={setPassNumber}
        placeholder="As shown in Rail Planner"
        autoCapitalize="characters"
      />
      <Input
        label="Validity"
        value={validity}
        onChangeText={setValidity}
        placeholder="7 days within 1 month"
      />
      <Button
        title="Save pass"
        disabled={!passNumber.trim()}
        onPress={() =>
          onSave({
            type,
            passNumber: passNumber.trim(),
            validity: validity.trim() || 'unspecified',
            travelClass: 2,
            format: 'mobile',
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  passRow: { marginTop: spacing.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.s },
});
