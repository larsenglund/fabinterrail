/**
 * Trains tab: journey search between any two European stations, with live
 * data (delays, platforms). Results can be added to the active trip as legs.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { searchJourneys } from '../api/transport';
import { StationPicker } from '../components/StationPicker';
import { Body, Button, Card, Dim, EmptyState, Input, SectionTitle } from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { colors, spacing } from '../theme';
import type { JourneyVM, Station } from '../types';
import { dayjs, fmtDuration, fmtTime } from '../utils/date';

export function TrainsScreen() {
  const [from, setFrom] = useState<Station>();
  const [to, setTo] = useState<Station>();
  const [when, setWhen] = useState('');
  const [journeys, setJourneys] = useState<JourneyVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const trip = useActiveTrip();
  const addLeg = useAppStore((s) => s.addLeg);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const search = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(undefined);
    try {
      const departure = when ? dayjs(when).toDate() : undefined;
      setJourneys(await searchJourneys({ fromId: from.id, toId: to.id, departure }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  };

  const addToTrip = (j: JourneyVM) => {
    if (!trip) return;
    const trains = j.legs.filter((l) => l.line).map((l) => l.line!) ;
    const overnight = !dayjs(j.departure).isSame(dayjs(j.arrival), 'day');
    addLeg(trip.id, {
      fromStopId: '',
      toStopId: '',
      summary: `${j.legs[0].origin} → ${j.legs[j.legs.length - 1].destination}`,
      departure: j.departure,
      arrival: j.arrival,
      trains,
      isNightTrain: overnight,
      refreshToken: j.refreshToken,
    });
    setAdded((prev) => new Set(prev).add(j.id));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.l, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <SectionTitle>Find trains</SectionTitle>
        <StationPicker label="From" value={from} onSelect={setFrom} />
        <StationPicker label="To" value={to} onSelect={setTo} />
        <Input
          label="Departure (optional, YYYY-MM-DD HH:mm)"
          value={when}
          onChangeText={setWhen}
          placeholder="leave empty for now"
          autoCapitalize="none"
        />
        <Button title="Search journeys" onPress={search} disabled={!from || !to} loading={loading} />
        {error ? <Dim>⚠️ {error}</Dim> : null}
      </Card>

      {journeys.length === 0 && !loading && (
        <EmptyState
          title="Pan-European journey search"
          hint="Timetables and realtime data via the open HAFAS network — covers long-distance trains across most of Europe."
        />
      )}

      {journeys.map((j) => {
        const delayed = j.legs.some((l) => l.departure !== l.plannedDeparture);
        return (
          <Card key={j.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.time}>
                {fmtTime(j.departure)} → {fmtTime(j.arrival)}
              </Text>
              <Dim>
                {fmtDuration(j.durationMinutes)} · {j.transfers} transfer{j.transfers === 1 ? '' : 's'}
              </Dim>
            </View>
            {delayed && <Dim>⚠️ realtime deviations on this journey</Dim>}
            {j.legs.map((l, i) => (
              <View key={i} style={styles.leg}>
                {l.line ? (
                  <>
                    <Body>
                      {l.line}
                      {l.direction ? ` → ${l.direction}` : ''}
                    </Body>
                    <Dim>
                      {fmtTime(l.departure)} {l.origin}
                      {l.departurePlatform ? ` (pl. ${l.departurePlatform})` : ''} — {fmtTime(l.arrival)}{' '}
                      {l.destination}
                      {l.cancelled ? ' · ❌ CANCELLED' : ''}
                    </Dim>
                  </>
                ) : (
                  <Dim>
                    🚶 transfer {l.origin} → {l.destination}
                  </Dim>
                )}
              </View>
            ))}
            {trip ? (
              <Button
                title={added.has(j.id) ? '✓ Added to trip' : `Add to “${trip.name}”`}
                kind={added.has(j.id) ? 'ghost' : 'primary'}
                disabled={added.has(j.id)}
                onPress={() => addToTrip(j)}
              />
            ) : (
              <Dim>Create a trip in the Trip tab to save journeys.</Dim>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: colors.text, fontSize: 18, fontWeight: '700' },
  leg: { marginTop: spacing.s },
});
