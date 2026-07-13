import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Dim({ children }: { children: React.ReactNode }) {
  return <Text style={styles.dim}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        kind === 'ghost' && styles.buttonGhost,
        kind === 'danger' && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.buttonText, kind === 'ghost' && { color: colors.primary }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: spacing.m }}>
      {props.label ? <Text style={styles.inputLabel}>{props.label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: color ?? colors.primary, borderColor: color ?? colors.primary },
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.dim}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  dim: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  inputLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    fontSize: 15,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    marginRight: spacing.s,
    marginBottom: spacing.s,
  },
  chipText: { color: colors.textDim, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.s },
});
