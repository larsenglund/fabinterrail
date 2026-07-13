/**
 * Trains: journey search. Search reads like a form on paper; results read
 * like a departure poster — times first, everything else second. Realtime
 * deviations surface in signal right in the numerals.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { searchJourneys } from '../api/transport';
import { StationPicker } from '../components/StationPicker';
import {
  Button,
  DateField,
  Dim,
  EmptyState,
  Header,
  Label,
  ListRow,
  TextAction,
} from '../components/ui';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { spacing, tabular, usePalette } from '../theme';
import { type JourneyVM, type Station } from '../types';
import { dayjs, fmtDuration, fmtTime } from '../utils/date';

export function TrainsScreen() {
  const p = usePalette();
  const [from, setFrom] = useState<Station>();
  const [to, setTo] = useState<Station>();
  const [date, setDate] = useState('');
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
      // With a date chosen, search from the morning of that day; else now.
      const departure = date ? dayjs(`${date}T08:00:00`).toDate() : undefined;
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
    const trains = j.legs.filter((l) => l.line).map((l) => l.line!);
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
      style={{ flex: 1, backgroundColor: p.paper }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header kicker="Journey search" title="Find trains" />

      <StationPicker label="From" value={from} onSelect={setFrom} />
      <StationPicker label="To" value={to} onSelect={setTo} />
      <DateField label="When (optional — defaults to now)" value={date} onChange={setDate} />
      <Button title="Search journeys" onPress={search} disabled={!from || !to} loading={loading} />
      {error ? <Dim style={{ color: p.danger }}>{error}</Dim> : null}

      {journeys.length === 0 && !loading && !error && (
        <EmptyState
          title="Pan-European journey search"
          hint="Timetables and realtime data via Transitous, the open European transit network — trains across all of Europe."
        />
      )}

      {journeys.length > 0 && (
        <View style={{ marginTop: spacing.l }}>
          <Label>{journeys.length} options · via Transitous · live</Label>
        </View>
      )}

      {journeys.map((j, ji) => {
        const depDelay = dayjs(j.legs[0].departure).diff(dayjs(j.legs[0].plannedDeparture), 'minute');
        const cancelled = j.legs.some((l) => l.cancelled);
        return (
          <ListRow
            key={j.id}
            last={ji === journeys.length - 1}
            aside={
              trip ? (
                <TextAction
                  title={added.has(j.id) ? 'Added ✓' : 'Add →'}
                  disabled={added.has(j.id)}
                  onPress={() => addToTrip(j)}
                />
              ) : undefined
            }
          >
            <Text style={[styles.times, tabular, { color: p.ink }]}>
              {fmtTime(j.departure)}
              {depDelay > 0 && (
                <Text style={[styles.late, { color: p.signalText }]}> +{depDelay}</Text>
              )}
              <Text style={[styles.arrow, { color: p.muted }]}>  →  </Text>
              {fmtTime(j.arrival)}
            </Text>
            <Dim style={tabular}>
              {j.legs
                .filter((l) => l.line)
                .map((l) => l.line)
                .join(' · ')}
              {' · '}
              {j.transfers === 0 ? 'direct' : `${j.transfers} change${j.transfers === 1 ? '' : 's'}`}
              {' · '}
              {fmtDuration(j.durationMinutes)}
              {j.legs[0].departurePlatform ? ` · pl. ${j.legs[0].departurePlatform}` : ''}
            </Dim>
            {cancelled && (
              <Dim style={{ color: p.danger, fontWeight: '700' }}>Partially cancelled — check details</Dim>
            )}
          </ListRow>
        );
      })}

      {!trip && journeys.length > 0 && <Dim>Create a trip in the Trip tab to save journeys.</Dim>}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: 48 },
  times: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  arrow: { fontSize: 20, fontWeight: '400' },
  late: { fontSize: 14, fontWeight: '700' },
});
