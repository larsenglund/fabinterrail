/** Debounced station autocomplete backed by the transport API. */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { searchStations } from '../api/transport';
import { colors, spacing } from '../theme';
import type { Station } from '../types';
import { Input } from './ui';

interface Props {
  label: string;
  value?: Station;
  onSelect: (station: Station) => void;
}

export function StationPicker({ label, value, onSelect }: Props) {
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
        <View style={styles.dropdown}>
          {results.map((st) => (
            <Pressable
              key={st.id}
              style={styles.item}
              onPress={() => {
                onSelect(st);
                setQuery(st.name);
                setOpen(false);
              }}
            >
              <Text style={styles.itemText}>{st.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: { color: colors.text, fontSize: 14 },
});
