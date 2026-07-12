/**
 * Departures tab: live station departure board with realtime delays,
 * platform changes and disruption remarks — for any station in the network.
 */

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDepartures } from '../api/transport';
import { StationPicker } from '../components/StationPicker';
import { Body, Card, Chip, Dim, EmptyState } from '../components/ui';
import { useActiveTrip } from '../store/appStore';
import { colors, spacing } from '../theme';
import type { Departure, Station } from '../types';
import { fmtTime } from '../utils/date';

export function DeparturesScreen() {
  const [station, setStation] = useState<Station>();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const trip = useActiveTrip();

  const load = useCallback(async (st: Station) => {
    setLoading(true);
    setError(undefined);
    try {
      setDepartures(await getDepartures(st.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load departures');
      setDepartures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const pick = (st: Station) => {
    setStation(st);
    void load(st);
  };

  const stopShortcuts = (trip?.stops ?? []).filter((s) => s.stationId && s.stationName);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.l, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => station && load(station)}
          tintColor={colors.text}
        />
      }
    >
      <Card>
        <StationPicker label="Station" value={station} onSelect={pick} />
        {stopShortcuts.length > 0 && (
          <View style={styles.chips}>
            {stopShortcuts.map((s) => (
              <Chip
                key={s.id}
                label={s.stationName!}
                onPress={() => pick({ id: s.stationId!, name: s.stationName! })}
              />
            ))}
          </View>
        )}
      </Card>

      {!station && (
        <EmptyState
          title="Live departure boards"
          hint="Pick any European station to see upcoming departures with realtime delays and platforms. Pull to refresh."
        />
      )}

      {station && !loading && departures.length === 0 && !error && (
        <EmptyState title="No departures found" hint="Try a bigger station nearby." />
      )}
      {error ? <Dim>⚠️ {error}</Dim> : null}

      {departures.map((d, i) => {
        const delayed = (d.delayMinutes ?? 0) > 0;
        const platformChanged = d.platform && d.plannedPlatform && d.platform !== d.plannedPlatform;
        return (
          <Card key={`${d.tripId}-${i}`} style={d.cancelled ? styles.cancelled : undefined}>
            <View style={styles.rowBetween}>
              <Body>
                <Text style={styles.line}>{d.line}</Text> → {d.direction}
              </Body>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.time, delayed && styles.delayed]}>
                  {fmtTime(d.when ?? d.plannedWhen)}
                </Text>
                {delayed && <Dim>plan {fmtTime(d.plannedWhen)} (+{d.delayMinutes})</Dim>}
              </View>
            </View>
            <Dim>
              {d.cancelled ? '❌ Cancelled' : `Platform ${d.platform ?? d.plannedPlatform ?? '–'}`}
              {platformChanged ? ` (was ${d.plannedPlatform})` : ''}
            </Dim>
            {d.remarks.map((r, ri) => (
              <Dim key={ri}>ℹ️ {r}</Dim>
            ))}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.s },
  line: { fontWeight: '700', color: colors.text },
  time: { color: colors.text, fontSize: 18, fontWeight: '700' },
  delayed: { color: colors.warning },
  cancelled: { opacity: 0.55 },
});
