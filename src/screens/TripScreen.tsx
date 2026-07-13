/**
 * Trip: the Gantt timeline is the home screen. Stops and legs listed as
 * hairline rows below; accommodations and warnings inline.
 */

import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GanttChart } from '../components/GanttChart';
import {
  Button,
  Chip,
  ChipRow,
  DateField,
  Dim,
  EmptyState,
  Header,
  Input,
  ListRow,
  SectionTitle,
  TextAction,
} from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { spacing, tabular, type, usePalette } from '../theme';
import { type Accommodation, type Stop } from '../types';
import { dayjs, fmtDate, fmtDateTime, nightsBetween } from '../utils/date';
import { fmtMoney } from '../utils/money';

export function TripScreen() {
  const p = usePalette();
  const trip = useActiveTrip();
  const trips = useAppStore((s) => s.trips);
  const { createTrip, setActiveTrip } = useAppStore();
  const [name, setName] = useState('');

  if (!trip) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={styles.content}>
        <Header kicker="FabInterrail" title="Start a trip" sub="Name your adventure, then add stops and trains." />
        <Input label="Trip name" value={name} onChangeText={setName} placeholder="Sommartåg 2026" />
        <Button title="Create trip" disabled={!name.trim()} onPress={() => createTrip(name.trim(), 'EUR')} />
        {trips.length > 0 && (
          <>
            <SectionTitle>Your trips</SectionTitle>
            <ChipRow>
              {trips.map((t) => (
                <Chip key={t.id} label={t.name} onPress={() => setActiveTrip(t.id)} />
              ))}
            </ChipRow>
          </>
        )}
      </ScrollView>
    );
  }

  return <TripDetail tripId={trip.id} />;
}

function TripDetail({ tripId }: { tripId: string }) {
  const p = usePalette();
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))!;
  const { addStop, removeStop, removeLeg, addAccommodation } = useAppStore();
  const [showStopForm, setShowStopForm] = useState(false);
  const [accForStop, setAccForStop] = useState<string | null>(null);

  const nights = trip.stops.reduce((n, s) => n + nightsBetween(s.arrival, s.departure), 0);
  const first = trip.stops[0]?.arrival;
  const last = trip.stops[trip.stops.length - 1]?.departure;
  const range =
    first && last ? `${dayjs(first).format('D')} — ${dayjs(last).format('D MMMM')}` : 'No dates yet';
  const dayNo = first ? dayjs().startOf('day').diff(dayjs(first).startOf('day'), 'day') + 1 : 0;
  const totalDays = first && last ? dayjs(last).diff(dayjs(first), 'day') + 1 : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={styles.content}>
      <Header
        kicker={`${range} · ${trip.travelerIds.length} travelers`}
        title={trip.name}
        sub={
          <>
            {trip.stops.length} stops · {trip.legs.length} legs · {nights} nights
            {dayNo >= 1 && dayNo <= totalDays ? (
              <Text style={{ color: p.good, fontWeight: '700' }}> · day {dayNo}</Text>
            ) : null}
          </>
        }
      />

      {trip.stops.length === 0 && trip.legs.length === 0 ? (
        <EmptyState
          title="No stops yet"
          hint="Add your first stop below, then find trains between stops in the Trains tab."
        />
      ) : (
        <View style={{ marginTop: spacing.s }}>
          <GanttChart trip={trip} />
        </View>
      )}

      <SectionTitle>Stops</SectionTitle>
      {trip.stops.map((stop, i) => {
        const n = nightsBetween(stop.arrival, stop.departure);
        const noBed = n > 0 && stop.accommodations.length === 0;
        return (
          <ListRow
            key={stop.id}
            last={i === trip.stops.length - 1 && !showStopForm}
            aside={
              <Text style={[styles.nights, tabular, { color: p.ink }]}>
                {n} <Text style={[styles.nightsUnit, { color: p.muted }]}>nights</Text>
              </Text>
            }
          >
            <View style={styles.stopTitleRow}>
              <Text style={[styles.rowTitle, { color: p.ink }]}>{stop.place}</Text>
              {noBed && <Chip label="no bed booked" tone="warn" />}
            </View>
            <Dim style={tabular}>
              {fmtDate(stop.arrival)} → {fmtDate(stop.departure)}
            </Dim>
            {stop.accommodations.map((a) => (
              <Dim key={a.id}>
                {a.name}
                {a.reference ? ` · ${a.reference}` : ''}
                {a.price ? ` · ${fmtMoney(a.price)}` : ''}
              </Dim>
            ))}
            <View style={styles.rowActions}>
              {accForStop === stop.id ? null : (
                <TextAction title="+ Bed" onPress={() => setAccForStop(stop.id)} />
              )}
              <TextAction
                title="Remove"
                onPress={() =>
                  Alert.alert('Remove stop?', `${stop.place} and its connected legs will be removed.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeStop(trip.id, stop.id) },
                  ])
                }
              />
            </View>
            {accForStop === stop.id && (
              <AccommodationForm
                onSave={(acc) => {
                  addAccommodation(trip.id, stop.id, acc);
                  setAccForStop(null);
                }}
                onCancel={() => setAccForStop(null)}
              />
            )}
          </ListRow>
        );
      })}

      {showStopForm ? (
        <StopForm
          onSave={(s) => {
            addStop(trip.id, s);
            setShowStopForm(false);
          }}
          onCancel={() => setShowStopForm(false)}
        />
      ) : (
        <Button title="+ Add stop" onPress={() => setShowStopForm(true)} />
      )}

      <SectionTitle>Train legs</SectionTitle>
      {trip.legs.length === 0 ? (
        <Dim>Search journeys in the Trains tab and add them to the trip.</Dim>
      ) : (
        trip.legs.map((leg, i) => (
          <ListRow
            key={leg.id}
            last={i === trip.legs.length - 1}
            aside={<TextAction title="Remove" onPress={() => removeLeg(trip.id, leg.id)} />}
          >
            <View style={styles.stopTitleRow}>
              <Text style={[styles.rowTitle, { color: p.ink }]}>{leg.summary}</Text>
              {leg.isNightTrain && <Chip label={`${leg.trains[0] ?? 'night train'} · night`} tone="night" />}
            </View>
            <Dim style={tabular}>
              {fmtDateTime(leg.departure)} → {fmtDateTime(leg.arrival)}
              {!leg.isNightTrain && leg.trains.length > 0 ? ` · ${leg.trains.join(', ')}` : ''}
            </Dim>
            {leg.reservationRequired && <Chip label="reservation required" tone="warn" />}
          </ListRow>
        ))
      )}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

function StopForm({
  onSave,
  onCancel,
}: {
  onSave: (s: Omit<Stop, 'id' | 'accommodations'>) => void;
  onCancel: () => void;
}) {
  const [place, setPlace] = useState('');
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const valid =
    place.trim() && /^\d{4}-\d{2}-\d{2}/.test(arrival) && /^\d{4}-\d{2}-\d{2}/.test(departure);
  return (
    <View style={{ marginTop: spacing.m }}>
      <Input label="Place" value={place} onChangeText={setPlace} placeholder="Berlin" />
      <DateField label="Arrival" value={arrival} onChange={setArrival} />
      <DateField label="Departure" value={departure} onChange={setDeparture} />
      <Button title="Add stop" disabled={!valid} onPress={() => onSave({ place: place.trim(), arrival, departure })} />
      <Button title="Cancel" kind="ghost" onPress={onCancel} />
    </View>
  );
}

function AccommodationForm({
  onSave,
  onCancel,
}: {
  onSave: (a: Omit<Accommodation, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [price, setPrice] = useState('');
  return (
    <View style={{ marginTop: spacing.m }}>
      <Input label="Name" value={name} onChangeText={setName} placeholder="Hostel Aurora" />
      <Input label="Booking reference" value={reference} onChangeText={setReference} placeholder="ABC123" autoCapitalize="characters" />
      <Input label="Total price (EUR, optional)" value={price} onChangeText={setPrice} placeholder="120" keyboardType="numeric" />
      <Button
        title="Save accommodation"
        disabled={!name.trim()}
        onPress={() =>
          onSave({
            name: name.trim(),
            kind: 'hostel',
            reference: reference.trim() || undefined,
            price: price ? { amount: parseFloat(price), currency: 'EUR' } : undefined,
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: 48 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  stopTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, flexWrap: 'wrap' },
  nights: { ...(type.rowTitle as object), fontSize: 16 },
  nightsUnit: { fontSize: 11, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: spacing.l, marginTop: spacing.s },
});
