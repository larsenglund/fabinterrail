/**
 * Trip tab: create a trip, add stops (with nights & accommodation) and see
 * the whole plan as a Gantt-style timeline, legs included.
 */

import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GanttChart } from '../components/GanttChart';
import { Body, Button, Card, Chip, Dim, EmptyState, Input, SectionTitle } from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { colors, spacing } from '../theme';
import type { Accommodation, Stop } from '../types';
import { fmtDate, fmtDateTime, nightsBetween } from '../utils/date';
import { fmtMoney } from '../utils/money';

export function TripScreen() {
  const trip = useActiveTrip();
  const trips = useAppStore((s) => s.trips);
  const { createTrip, setActiveTrip } = useAppStore();

  if (!trip) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.l }}>
        <NewTripForm onCreate={(name) => createTrip(name, 'EUR')} />
        {trips.length > 0 && (
          <Card>
            <SectionTitle>Your trips</SectionTitle>
            {trips.map((t) => (
              <Chip key={t.id} label={t.name} onPress={() => setActiveTrip(t.id)} />
            ))}
          </Card>
        )}
      </ScrollView>
    );
  }

  return <TripDetail tripId={trip.id} />;
}

function NewTripForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Card>
      <SectionTitle>Start a new trip</SectionTitle>
      <Dim>Give your Interrail adventure a name, then add stops and train legs.</Dim>
      <View style={{ height: spacing.m }} />
      <Input label="Trip name" value={name} onChangeText={setName} placeholder="Summer Interrail 2026" />
      <Button title="Create trip" disabled={!name.trim()} onPress={() => onCreate(name.trim())} />
    </Card>
  );
}

function TripDetail({ tripId }: { tripId: string }) {
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId))!;
  const { addStop, removeStop, removeLeg, addAccommodation } = useAppStore();
  const [showStopForm, setShowStopForm] = useState(false);
  const [accForStop, setAccForStop] = useState<string | null>(null);

  const nights = trip.stops.reduce((n, s) => n + nightsBetween(s.arrival, s.departure), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.l, paddingBottom: 48 }}>
      <Text style={styles.title}>{trip.name}</Text>
      <Dim>
        {trip.stops.length} stops · {trip.legs.length} train legs · {nights} nights
      </Dim>
      <View style={{ height: spacing.m }} />

      {trip.stops.length === 0 && trip.legs.length === 0 ? (
        <EmptyState
          title="No stops yet"
          hint="Add your first stop below, then find trains between stops in the Trains tab."
        />
      ) : (
        <GanttChart trip={trip} />
      )}

      <View style={{ height: spacing.l }} />
      <SectionTitle>Stops</SectionTitle>
      {trip.stops.map((stop) => (
        <Card key={stop.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.stopName}>{stop.place}</Text>
            <Dim>{nightsBetween(stop.arrival, stop.departure)} nights</Dim>
          </View>
          <Dim>
            {fmtDate(stop.arrival)} → {fmtDate(stop.departure)}
          </Dim>
          {stop.accommodations.map((a) => (
            <View key={a.id} style={styles.accRow}>
              <Body>
                🛏 {a.name} {a.reference ? `(${a.reference})` : ''}
              </Body>
              <Dim>
                {a.kind}
                {a.price ? ` · ${fmtMoney(a.price)}` : ''}
              </Dim>
            </View>
          ))}
          {accForStop === stop.id ? (
            <AccommodationForm
              onSave={(acc) => {
                addAccommodation(trip.id, stop.id, acc);
                setAccForStop(null);
              }}
              onCancel={() => setAccForStop(null)}
            />
          ) : (
            <View style={styles.rowBetween}>
              <Button title="+ Accommodation" kind="ghost" onPress={() => setAccForStop(stop.id)} />
              <Button
                title="Remove"
                kind="danger"
                onPress={() =>
                  Alert.alert('Remove stop?', `${stop.place} and its connected legs will be removed.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeStop(trip.id, stop.id) },
                  ])
                }
              />
            </View>
          )}
        </Card>
      ))}

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

      <View style={{ height: spacing.l }} />
      <SectionTitle>Train legs</SectionTitle>
      {trip.legs.length === 0 ? (
        <Dim>Search journeys in the Trains tab and add them to the trip.</Dim>
      ) : (
        trip.legs.map((leg) => (
          <Card key={leg.id}>
            <Body>
              {leg.isNightTrain ? '🌙 ' : '🚆 '}
              {leg.summary}
            </Body>
            <Dim>
              {fmtDateTime(leg.departure)} → {fmtDateTime(leg.arrival)}
              {leg.trains.length > 0 ? ` · ${leg.trains.join(', ')}` : ''}
            </Dim>
            {leg.reservationRequired && <Dim>⚠️ Seat reservation required</Dim>}
            <Button title="Remove leg" kind="ghost" onPress={() => removeLeg(trip.id, leg.id)} />
          </Card>
        ))
      )}
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
  const valid = place.trim() && /^\d{4}-\d{2}-\d{2}/.test(arrival) && /^\d{4}-\d{2}-\d{2}/.test(departure);
  return (
    <Card>
      <SectionTitle>New stop</SectionTitle>
      <Input label="Place" value={place} onChangeText={setPlace} placeholder="Berlin" />
      <Input
        label="Arrival (YYYY-MM-DD)"
        value={arrival}
        onChangeText={setArrival}
        placeholder="2026-07-14"
        autoCapitalize="none"
      />
      <Input
        label="Departure (YYYY-MM-DD)"
        value={departure}
        onChangeText={setDeparture}
        placeholder="2026-07-17"
        autoCapitalize="none"
      />
      <Button
        title="Add stop"
        disabled={!valid}
        onPress={() => onSave({ place: place.trim(), arrival, departure })}
      />
      <Button title="Cancel" kind="ghost" onPress={onCancel} />
    </Card>
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
      <Input label="Booking reference" value={reference} onChangeText={setReference} placeholder="ABC123" />
      <Input
        label="Total price (EUR, optional)"
        value={price}
        onChangeText={setPrice}
        placeholder="120"
        keyboardType="numeric"
      />
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
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  accRow: { marginTop: spacing.s },
});
