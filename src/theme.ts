/**
 * Design tokens — "the timetable is the interface".
 * Source of truth: design/tokens.md + design/mockups.html (approved Phase 0).
 *
 * Paper & ink, hairline rules, heavy tabular numerals. One signal accent,
 * spent on one thing per screen. Indigo appears only for night trains.
 * Dark theme is "night-train mode" — designed, not inverted.
 */

import { Platform, useColorScheme } from 'react-native';

export interface Palette {
  paper: string;
  field: string;
  ink: string;
  muted: string;
  hair: string;
  signal: string; // marks & primary actions
  signalText: string; // small signal-colored text (brighter in dark)
  night: string;
  nightInk: string; // text on a night bar
  slate: string; // neutral data marks (gantt stays, budget bars)
  slateInk: string; // text on a slate bar
  good: string;
  danger: string;
}

export const lightPalette: Palette = {
  paper: '#FBF9F5',
  field: '#F3EFE7',
  ink: '#211D16',
  muted: '#7A7263',
  hair: '#E6E0D4',
  signal: '#C2570A',
  signalText: '#C2570A',
  night: '#4F46B8',
  nightInk: '#FBF9F5',
  slate: '#57534A',
  slateInk: '#FBF9F5',
  good: '#3D7A44',
  danger: '#B3261E',
};

export const darkPalette: Palette = {
  paper: '#15171F',
  field: '#1D202B',
  ink: '#ECE9E1',
  muted: '#979DAD',
  hair: '#2A2E3B',
  signal: '#D07B22',
  signalText: '#EDA14E',
  night: '#8B84E8',
  nightInk: '#15171F',
  slate: '#8A8478',
  slateInk: '#15171F',
  good: '#7FBF87',
  danger: '#E58B84',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? darkPalette : lightPalette;
}

export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radii = { s: 6, m: 10, l: 12 } as const;

/** Type scale. Sizes/weights per design/tokens.md; colors come from the palette. */
export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.7 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  section: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 15 },
  secondary: { fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
} as const;

export const tabular: { fontVariant: ('tabular-nums')[] } = { fontVariant: ['tabular-nums'] };

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/** Avatar hues for travelers, tuned to sit on both grounds. */
export const travelerPalette = ['#C2570A', '#4F46B8', '#3D7A44', '#8E3F8E', '#2E6E8E', '#8A6D1F'];
