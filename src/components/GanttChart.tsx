/**
 * Gantt-style trip timeline.
 *
 * Horizontal axis = calendar days of the trip. Each stop renders as a bar
 * spanning its stay (with nights + accommodation info); the train legs render
 * on a separate "Travel" row so overnight trains and long transfers are
 * visible at a glance.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import type { Trip } from '../types';
import { dayjs, fmtTime, nightsBetween } from '../utils/date';

const DAY_WIDTH = 64;
const ROW_HEIGHT = 44;
const LABEL_WIDTH = 90;

interface Props {
  trip: Trip;
}

export function GanttChart({ trip }: Props) {
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

  const width = LABEL_WIDTH + days.length * DAY_WIDTH;
  const today = dayjs().startOf('day');
  const todayOffset = today.diff(start, 'day');

  const xFor = (iso: string) => {
    const d = dayjs(iso);
    const dayIdx = d.startOf('day').diff(start, 'day');
    const frac = (d.hour() + d.minute() / 60) / 24;
    return LABEL_WIDTH + (dayIdx + frac) * DAY_WIDTH;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scroller}>
      <View style={{ width }}>
        {/* Day header */}
        <View style={styles.headerRow}>
          <View style={{ width: LABEL_WIDTH }} />
          {days.map((d) => {
            const dd = dayjs(d);
            const isToday = dd.isSame(today, 'day');
            return (
              <View key={d} style={[styles.dayCell, isToday && styles.todayCell]}>
                <Text style={[styles.dayName, isToday && { color: colors.accent }]}>
                  {dd.format('dd')}
                </Text>
                <Text style={[styles.dayNum, isToday && { color: colors.accent }]}>
                  {dd.format('D/M')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Stops: one row per stop */}
        {trip.stops.map((stop, i) => {
          const x0 = xFor(stop.arrival);
          const x1 = Math.max(xFor(stop.departure), x0 + 20);
          const nights = nightsBetween(stop.arrival, stop.departure);
          const hasBed = stop.accommodations.length > 0;
          return (
            <View key={stop.id} style={[styles.row, { height: ROW_HEIGHT }]}>
              <View style={styles.rowLabelBox}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {stop.place}
                </Text>
              </View>
              {days.map((d) => (
                <View key={d} style={styles.gridCell} />
              ))}
              <View
                style={[
                  styles.bar,
                  {
                    left: x0,
                    width: x1 - x0,
                    backgroundColor: stop.color ?? barColor(i),
                  },
                ]}
              >
                <Text style={styles.barText} numberOfLines={1}>
                  {nights > 0 ? `${nights}🌙` : 'day'}
                  {hasBed ? ' 🛏' : nights > 0 ? ' ⚠️ no bed' : ''}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Travel row: all legs */}
        <View style={[styles.row, { height: ROW_HEIGHT }]}>
          <View style={styles.rowLabelBox}>
            <Text style={[styles.rowLabel, { color: colors.textDim }]}>Trains</Text>
          </View>
          {days.map((d) => (
            <View key={d} style={styles.gridCell} />
          ))}
          {trip.legs.map((leg) => {
            const x0 = xFor(leg.departure);
            const x1 = Math.max(xFor(leg.arrival), x0 + 14);
            return (
              <View
                key={leg.id}
                style={[
                  styles.bar,
                  styles.legBar,
                  leg.isNightTrain && { backgroundColor: colors.night },
                  { left: x0, width: x1 - x0 },
                ]}
              >
                <Text style={styles.barText} numberOfLines={1}>
                  {leg.isNightTrain ? '🌙 ' : '🚆 '}
                  {fmtTime(leg.departure)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Today marker */}
        {todayOffset >= 0 && todayOffset < days.length && (
          <View
            pointerEvents="none"
            style={[
              styles.todayLine,
              { left: LABEL_WIDTH + todayOffset * DAY_WIDTH, height: (trip.stops.length + 1) * ROW_HEIGHT + 40 },
            ]}
          />
        )}
      </View>
    </ScrollView>
  );
}

const BAR_COLORS = ['#4f8ef7', '#38c6a3', '#f7b84f', '#e06ccf', '#5fd0f7', '#9ccf5f'];
function barColor(i: number): string {
  return BAR_COLORS[i % BAR_COLORS.length];
}

const styles = StyleSheet.create({
  scroller: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', paddingVertical: spacing.s },
  dayCell: { width: DAY_WIDTH, alignItems: 'center' },
  todayCell: {},
  dayName: { color: colors.textDim, fontSize: 11 },
  dayNum: { color: colors.text, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabelBox: { width: LABEL_WIDTH, paddingLeft: spacing.m, justifyContent: 'center' },
  rowLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  gridCell: {
    width: DAY_WIDTH,
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  bar: {
    position: 'absolute',
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  legBar: { backgroundColor: colors.accent, height: 22 },
  barText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  todayLine: {
    position: 'absolute',
    top: 34,
    width: 2,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
});
