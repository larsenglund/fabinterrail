/** Debounced station autocomplete backed by the transport API. */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { searchStations } from '../api/transport';
import { radii, spacing, usePalette } from '../theme';
import { type Station } from '../types';
import { Input } from './ui';

interface Props {
  label: string;
  value?: Station;
  onSelect: (station: Station) => void;
}

export function StationPicker({ label, value, onSelect }: Props) {
  const p = usePalette();
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<Station[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setResults(await searchStations(query));
      } catch {
        setResults([]);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, open]);

  return (
    <View style={{ zIndex: 10 }}>
      <Input
        label={label}
        value={query}
        placeholder="Type a station, e.g. Berlin Hbf"
        onChangeText={(t) => {
          setQuery(t);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: p.field, borderColor: p.hair }]}>
          {results.map((st, i) => (
            <Pressable
              key={st.id}
              style={[
                styles.item,
                i < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.hair },
              ]}
              onPress={() => {
                onSelect(st);
                setQuery(st.name);
                setOpen(false);
              }}
            >
              <Text style={{ color: p.ink, fontSize: 14 }}>{st.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderRadius: radii.m,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  item: { paddingVertical: 10, paddingHorizontal: spacing.m },
});
