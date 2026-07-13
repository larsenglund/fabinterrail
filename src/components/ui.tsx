/**
 * UI primitives implementing the approved design system (design/tokens.md):
 * hairline-separated rows instead of cards, uppercase labels, one signal
 * accent, native platform typography.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
} from 'react-native';

import { radii, spacing, type, usePalette } from '../theme';
import { fmtDate } from '../utils/date';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function Kicker({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return <Text style={[styles.label, { color: p.muted }]}>{children}</Text>;
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return <Text style={[type.title as TextStyle, { color: p.ink, marginTop: 2 }]}>{children}</Text>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return <Text style={[styles.secondary, { color: p.muted, marginTop: 2 }]}>{children}</Text>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const p = usePalette();
  return <Text style={[styles.label, { color: p.muted }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const p = usePalette();
  return <Text style={[styles.body, { color: p.ink }, style]}>{children}</Text>;
}

export function Dim({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const p = usePalette();
  return <Text style={[styles.secondary, { color: p.muted }, style]}>{children}</Text>;
}

/** Screen header block: kicker + title (+ optional sub line). */
export function Header({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: React.ReactNode;
}) {
  return (
    <View style={{ paddingVertical: spacing.s }}>
      <Kicker>{kicker}</Kicker>
      <ScreenTitle>{title}</ScreenTitle>
      {sub ? <Sub>{sub}</Sub> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Hairline-separated list row: content left, aside right. */
export function ListRow({
  children,
  aside,
  last,
  onPress,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const p = usePalette();
  const inner = (
    <View
      style={[
        styles.listRow,
        { borderBottomColor: p.hair, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <View style={{ flex: 1 }}>{children}</View>
      {aside ? <View style={styles.aside}>{aside}</View> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {inner}
    </Pressable>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.hair }} />;
}

/** Section heading in a list context. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <Text style={[styles.label, { color: p.muted, marginTop: spacing.xl, marginBottom: spacing.xs }]}>
      {children}
    </Text>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const p = usePalette();
  return (
    <View style={styles.empty}>
      <Text style={[styles.rowTitle, { color: p.ink, marginBottom: spacing.s }]}>{title}</Text>
      {hint ? <Text style={[styles.secondary, { color: p.muted, textAlign: 'center' }]}>{hint}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const p = usePalette();
  const bg = kind === 'primary' ? p.signal : kind === 'danger' ? p.danger : 'transparent';
  const fg = kind === 'ghost' ? p.signalText : '#FFF7EE';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        kind === 'ghost' && styles.buttonGhost,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** Inline text action, e.g. "Add →" on a result row. */
export function TextAction({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => (pressed || disabled) && { opacity: 0.5 }}>
      <Text style={[styles.rowTitle, { color: p.signalText, fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const p = usePalette();
  return (
    <View style={{ marginBottom: spacing.m }}>
      {props.label ? <Label style={{ marginBottom: 4 }}>{props.label}</Label> : null}
      <TextInput
        placeholderTextColor={p.muted}
        {...props}
        style={[
          styles.input,
          { backgroundColor: p.field, borderColor: p.hair, color: p.ink },
          props.style,
        ]}
      />
    </View>
  );
}

/** Date field: native picker on iOS/Android, ISO text input on web. */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (isoDate: string) => void;
}) {
  const p = usePalette();
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <Input
        label={label}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
    );
  }

  return (
    <View style={{ marginBottom: spacing.m }}>
      <Label style={{ marginBottom: 4 }}>{label}</Label>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.input, { backgroundColor: p.field, borderColor: p.hair }]}
      >
        <Text style={[styles.body, { color: value ? p.ink : p.muted }]}>
          {value ? fmtDate(value) : 'Pick a date'}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShow(false);
            if (date) onChange(date.toISOString().slice(0, 10));
          }}
        />
      )}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'warn' | 'night' | 'ok';
}) {
  const p = usePalette();
  const toneColor =
    tone === 'warn' ? p.signalText : tone === 'night' ? p.night : tone === 'ok' ? p.good : p.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { borderColor: tone === 'neutral' ? p.hair : toneColor },
        active && { backgroundColor: p.signal, borderColor: p.signal },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFF7EE' : toneColor }]}>{label}</Text>
    </Pressable>
  );
}

/** Wrapping chip container. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  label: type.label as TextStyle,
  body: type.body as TextStyle,
  secondary: { ...(type.secondary as TextStyle), lineHeight: 18 },
  rowTitle: type.rowTitle as TextStyle,
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
  },
  aside: { alignItems: 'flex-end', flexShrink: 0 },
  button: {
    borderRadius: radii.l,
    paddingVertical: 13,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  buttonGhost: { paddingVertical: 8 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  input: {
    borderRadius: radii.m,
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    paddingVertical: 11,
    fontSize: 15,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginVertical: spacing.s },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl },
});
