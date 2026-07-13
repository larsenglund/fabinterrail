/**
 * Gantt-style trip timeline — the centerpiece of the Trip screen.
 *
 * Visual language (design/tokens.md): stay bars in neutral slate (identity
 * lives in the row labels), night trains in indigo, today marker in signal.
 * A stop without a booked bed gets a signal outline.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, tabular, usePalette } from '../theme';
import { type Trip } from '../types';
import { dayjs, nightsBetween } from '../utils/date';

const DAY_WIDTH = 28;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 92;

export function GanttChart({ trip }: { trip: Trip }) {
  const p = usePalette();

  const { days, start } = useMemo(() => {
    const dates = [
      ...trip.stops.flatMap((s) => [s.arrival, s.departure]),
      ...trip.legs.flatMap((l) => [l.departure, l.arrival]),
    ].filter(Boolean);
    if (dates.length === 0) return { days: [] as string[], start: dayjs() };
    const min = dayjs.min(dates.map((d) => dayjs(d)))!.startOf('day');
    const max = dayjs.max(dates.map((d) => dayjs(d)))!.startOf('day');
    const n = max.diff(min, 'day') + 1;
    return {
      days: Array.from({ length: n }, (_, i) => min.add(i, 'day').format('YYYY-MM-DD')),
      start: min,
    };
  }, [trip]);

  if (days.length === 0) return null;

  const today = dayjs().startOf('day');
  const todayOffset = today.diff(start, 'day');
  const showToday = todayOffset >= 0 && todayOffset < days.length;
  const width = LABEL_WIDTH + days.length * DAY_WIDTH;

  const xFor = (iso: string) => {
    const d = dayjs(iso);
    const dayIdx = d.startOf('day').diff(start, 'day');
    const frac = (d.hour() + d.minute() / 60) / 24;
    return LABEL_WIDTH + (dayIdx + frac) * DAY_WIDTH;
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.l }} contentContainerStyle={{ paddingHorizontal: spacing.l }}>
        <View style={{ width }}>
          {/* Day axis */}
          <View style={styles.headerRow}>
            <View style={{ width: LABEL_WIDTH }} />
            {days.map((d) => {
              const dd = dayjs(d);
              const isToday = dd.isSame(today, 'day');
              return (
                <Text
                  key={d}
                  style={[
                    styles.dayNum,
                    tabular,
                    { color: isToday ? p.signalText : p.muted, fontWeight: isToday ? '800' : '500' },
                  ]}
                >
                  {dd.format('D')}
                </Text>
              );
            })}
          </View>

          {/* One row per stop */}
          {trip.stops.map((stop) => {
            const x0 = xFor(stop.arrival);
            const x1 = Math.max(xFor(stop.departure), x0 + 22);
            const nights = nightsBetween(stop.arrival, stop.departure);
            const noBed = nights > 0 && stop.accommodations.length === 0;
            return (
              <View key={stop.id} style={[styles.row, { height: ROW_HEIGHT, borderBottomColor: p.hair }]}>
                <Text numberOfLines={1} style={[styles.rowLabel, { color: p.ink, width: LABEL_WIDTH }]}>
                  {stop.place}
                </Text>
                <View
                  style={[
                    styles.bar,
                    { left: x0, width: x1 - x0, backgroundColor: p.slate },
                    noBed && { borderWidth: 2, borderColor: p.signal },
                  ]}
                >
                  <Text numberOfLines={1} style={[styles.barText, { color: p.slateInk }]}>
                    {nights > 0 ? `${nights} n${noBed ? ' · no bed' : ''}` : 'day'}
                  </Text>
                </View>
                {showToday && <TodayLine x={LABEL_WIDTH + todayOffset * DAY_WIDTH + DAY_WIDTH / 2} color={p.signal} />}
              </View>
            );
          })}

          {/* Travel row */}
          <View style={[styles.row, { height: ROW_HEIGHT - 6, borderBottomColor: 'transparent' }]}>
            <Text style={[styles.rowLabel, styles.travelLabel, { color: p.muted, width: LABEL_WIDTH }]}>
              TRAVEL
            </Text>
            {trip.legs.map((leg) => {
              const x0 = xFor(leg.departure);
              const x1 = Math.max(xFor(leg.arrival), x0 + 14);
              return (
                <View
                  key={leg.id}
                  style={[
                    styles.travelBar,
                    {
                      left: x0,
                      width: x1 - x0,
                      backgroundColor: leg.isNightTrain ? p.night : p.slate,
                      opacity: leg.isNightTrain ? 1 : 0.55,
                    },
                  ]}
                />
              );
            })}
            {showToday && <TodayLine x={LABEL_WIDTH + todayOffset * DAY_WIDTH + DAY_WIDTH / 2} color={p.signal} />}
          </View>
        </View>
      </ScrollView>

      {/* Key */}
      <View style={styles.key}>
        <KeySwatch color={p.slate} label="Stay" muted={p.muted} />
        <KeySwatch color={p.night} label="Night train" muted={p.muted} />
        <KeySwatch color={p.signal} label="Today" muted={p.muted} line />
      </View>
    </View>
  );
}

function TodayLine({ x, color }: { x: number; color: string }) {
  return <View pointerEvents="none" style={[styles.todayLine, { left: x, backgroundColor: color }]} />;
}

function KeySwatch({
  color,
  label,
  muted,
  line,
}: {
  color: string;
  label: string;
  muted: string;
  line?: boolean;
}) {
  return (
    <View style={styles.keyItem}>
      <View
        style={
          line
            ? { width: 2, height: 12, backgroundColor: color, borderRadius: 1 }
            : { width: 14, height: 8, backgroundColor: color, borderRadius: 4 }
        }
      />
      <Text style={{ fontSize: 11, color: muted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingBottom: 6 },
  dayNum: { width: DAY_WIDTH, textAlign: 'center', fontSize: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 12, fontWeight: '700', paddingRight: spacing.s },
  travelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },
  bar: {
    position: 'absolute',
    height: 22,
    borderRadius: radii.s,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  barText: { fontSize: 10, fontWeight: '700' },
  travelBar: { position: 'absolute', height: 12, borderRadius: radii.s },
  todayLine: { position: 'absolute', top: -2, bottom: -2, width: 2, borderRadius: 1, opacity: 0.85 },
  key: { flexDirection: 'row', gap: spacing.l, marginTop: spacing.m },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
