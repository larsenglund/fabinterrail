/**
 * People: the group. Personal details stay on this device (sensitive fields
 * in the platform keychain). Pass numbers set in monospace, like the codes
 * they are.
 */

import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  TextAction,
} from '../components/ui';
import { useAppStore } from '../store/appStore';
import { mono, spacing, usePalette } from '../theme';
import { type PassType, type RailPass, type Traveler } from '../types';

const PASS_TYPES: { value: PassType; label: string }[] = [
  { value: 'interrail-global', label: 'Interrail Global' },
  { value: 'interrail-one-country', label: 'Interrail One Country' },
  { value: 'eurail-global', label: 'Eurail Global' },
  { value: 'other', label: 'Other' },
];

export function TravelersScreen() {
  const p = usePalette();
  const travelers = useAppStore((s) => s.travelers);
  const { addTraveler, removeTraveler } = useAppStore();
  const [name, setName] = useState('');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={styles.content}>
      <Header
        kicker="The group"
        title="People"
        sub="Details and pass numbers are stored only on this device."
      />

      <Input label="Add traveler" value={name} onChangeText={setName} placeholder="Name" />
      <Button
        title="Add"
        disabled={!name.trim()}
        onPress={() => {
          addTraveler(name.trim());
          setName('');
        }}
      />

      {travelers.length === 0 && (
        <EmptyState title="No travelers yet" hint="Add everyone in your group to share costs and store passes." />
      )}

      {travelers.map((t) => (
        <TravelerBlock
          key={t.id}
          traveler={t}
          onRemove={() =>
            Alert.alert('Remove traveler?', `${t.name} will be removed from all trips.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => removeTraveler(t.id) },
            ])
          }
        />
      ))}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

function TravelerBlock({ traveler, onRemove }: { traveler: Traveler; onRemove: () => void }) {
  const p = usePalette();
  const { updateTraveler, addPass, removePass } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);

  return (
    <View style={[styles.block, { borderTopColor: p.hair }]}>
      <View style={styles.nameRow}>
        <View style={[styles.avatar, { backgroundColor: traveler.color }]}>
          <Text style={styles.avatarText}>{traveler.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: p.ink }]}>{traveler.name}</Text>
        <View style={{ flex: 1 }} />
        <TextAction title={editing ? 'Done' : 'Edit'} onPress={() => setEditing(!editing)} />
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
        <View style={{ marginTop: spacing.xs }}>
          {traveler.passportNumber ? (
            <Dim>
              Passport <Text style={{ fontFamily: mono }}>{traveler.passportNumber}</Text>
            </Dim>
          ) : null}
          {traveler.phone ? <Dim>{traveler.phone}</Dim> : null}
        </View>
      )}

      <View style={{ marginTop: spacing.m }}>
        <Label>Passes</Label>
        {traveler.passes.length === 0 && !showPassForm && <Dim>No pass stored yet.</Dim>}
        {traveler.passes.map((pass, i) => (
          <ListRow
            key={pass.id}
            last={i === traveler.passes.length - 1}
            aside={<TextAction title="Remove" onPress={() => removePass(traveler.id, pass.id)} />}
          >
            <Text style={[styles.passTitle, { color: p.ink }]}>
              {PASS_TYPES.find((pt) => pt.value === pass.type)?.label ?? pass.type} · {pass.validity}
            </Text>
            <Text style={[styles.passNumber, { color: p.muted, fontFamily: mono }]}>
              {pass.passNumber} · {pass.format} · {pass.travelClass}nd cl
            </Text>
          </ListRow>
        ))}
        {showPassForm ? (
          <PassForm
            onSave={(pass) => {
              addPass(traveler.id, pass);
              setShowPassForm(false);
            }}
            onCancel={() => setShowPassForm(false)}
          />
        ) : (
          <TextAction title="+ Add pass" onPress={() => setShowPassForm(true)} />
        )}
      </View>
    </View>
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
    <View style={{ marginTop: spacing.s }}>
      <ChipRow>
        {PASS_TYPES.map((pt) => (
          <Chip key={pt.value} label={pt.label} active={type === pt.value} onPress={() => setType(pt.value)} />
        ))}
      </ChipRow>
      <Input
        label="Pass number"
        value={passNumber}
        onChangeText={setPassNumber}
        placeholder="As shown in Rail Planner"
        autoCapitalize="characters"
      />
      <Input label="Validity" value={validity} onChangeText={setValidity} placeholder="7 days within 1 month" />
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
  content: { padding: spacing.l, paddingBottom: 48 },
  block: { marginTop: spacing.xl, paddingTop: spacing.l, borderTopWidth: StyleSheet.hairlineWidth },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF7EE', fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800' },
  passTitle: { fontSize: 14, fontWeight: '700' },
  passNumber: { fontSize: 12, marginTop: 2 },
});
