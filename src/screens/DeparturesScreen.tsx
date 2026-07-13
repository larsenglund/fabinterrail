/**
 * Board: a departure board in your pocket. Time, train, destination,
 * platform. Delays rewrite the numeral in signal; platform changes flip the
 * platform to signal; cancellations strike through.
 */

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDepartures } from '../api/transport';
import { StationPicker } from '../components/StationPicker';
import { Chip, ChipRow, Dim, EmptyState, Header } from '../components/ui';
import { useActiveTrip } from '../store/appStore';
import { spacing, tabular, usePalette } from '../theme';
import { type Departure, type Station } from '../types';
import { dayjs, fmtTime } from '../utils/date';

export function DeparturesScreen() {
  const p = usePalette();
  const [station, setStation] = useState<Station>();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const trip = useActiveTrip();

  const load = useCallback(async (st: Station) => {
    setLoading(true);
    setError(undefined);
    try {
      setDepartures(await getDepartures(st.id));
      setUpdatedAt(dayjs().format('HH:mm'));
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
      style={{ flex: 1, backgroundColor: p.paper }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => station && load(station)} tintColor={p.ink} />
      }
    >
      <Header
        kicker="Departures"
        title={station?.name ?? 'Pick a station'}
        sub={
          station && updatedAt ? (
            <>
              <Text style={{ color: p.good, fontWeight: '700' }}>● LIVE</Text> · updated {updatedAt} ·
              pull to refresh
            </>
          ) : undefined
        }
      />

      <StationPicker label="Station" value={station} onSelect={pick} />
      {stopShortcuts.length > 0 && (
        <ChipRow>
          {stopShortcuts.map((s) => (
            <Chip key={s.id} label={s.stationName!} onPress={() => pick({ id: s.stationId!, name: s.stationName! })} />
          ))}
        </ChipRow>
      )}

      {!station && (
        <EmptyState
          title="Live departure boards"
          hint="Pick any European station to see upcoming departures with realtime delays and platforms."
        />
      )}
      {station && !loading && departures.length === 0 && !error && (
        <EmptyState title="No departures found" hint="Try a bigger station nearby." />
      )}
      {error ? <Dim style={{ color: p.danger }}>{error}</Dim> : null}

      {departures.map((d, i) => {
        const delayed = (d.delayMinutes ?? 0) > 0;
        const platformChanged = !!(d.platform && d.plannedPlatform && d.platform !== d.plannedPlatform);
        return (
          <View
            key={`${d.tripId}-${i}`}
            style={[
              styles.depRow,
              { borderBottomColor: p.hair },
              i === departures.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.depTimeCol}>
              <Text
                style={[
                  styles.depTime,
                  tabular,
                  { color: delayed ? p.signalText : p.ink },
                  d.cancelled && styles.struck,
                ]}
              >
                {fmtTime(d.when ?? d.plannedWhen)}
              </Text>
              {delayed && (
                <Text style={[styles.depPlan, tabular, { color: p.signalText }]}>
                  plan {fmtTime(d.plannedWhen)} +{d.delayMinutes}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.depLine, { color: p.muted }]}>{d.line}</Text>
              <Text style={[styles.depDest, { color: p.ink }, d.cancelled && styles.struck]}>
                {d.direction}
              </Text>
              {d.cancelled ? (
                <Text style={[styles.depNote, { color: p.danger, fontWeight: '700' }]}>Cancelled</Text>
              ) : (
                d.remarks.slice(0, 1).map((r, ri) => (
                  <Text key={ri} numberOfLines={1} style={[styles.depNote, { color: p.muted }]}>
                    {r}
                  </Text>
                ))
              )}
            </View>
            <View style={styles.depPlatCol}>
              <Text
                style={[
                  styles.depPlat,
                  tabular,
                  { color: platformChanged ? p.signalText : p.ink },
                ]}
              >
                {d.cancelled ? '–' : (d.platform ?? d.plannedPlatform ?? '–')}
              </Text>
              <Text style={[styles.depPlatLabel, { color: p.muted }]}>
                {platformChanged ? `was ${d.plannedPlatform}` : 'platform'}
              </Text>
            </View>
          </View>
        );
      })}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: 48 },
  depRow: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  depTimeCol: { width: 82 },
  depTime: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  depPlan: { fontSize: 11, fontWeight: '700' },
  depLine: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  depDest: { fontSize: 15, fontWeight: '600' },
  depNote: { fontSize: 12 },
  depPlatCol: { alignItems: 'center', minWidth: 52 },
  depPlat: { fontSize: 18, fontWeight: '800' },
  depPlatLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  struck: { textDecorationLine: 'line-through', opacity: 0.5 },
});
