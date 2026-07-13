import { describe, expect, it } from 'vitest';

import { delayMinutes, fmtDuration, nightsBetween } from './date';

describe('nightsBetween', () => {
  it('counts whole nights between dates', () => {
    expect(nightsBetween('2026-07-14', '2026-07-17')).toBe(3);
  });

  it('ignores time-of-day', () => {
    expect(nightsBetween('2026-07-14T23:50:00', '2026-07-15T06:10:00')).toBe(1);
  });

  it('is zero for a same-day visit and never negative', () => {
    expect(nightsBetween('2026-07-14', '2026-07-14')).toBe(0);
    expect(nightsBetween('2026-07-17', '2026-07-14')).toBe(0);
  });
});

describe('delayMinutes', () => {
  it('computes realtime minus planned', () => {
    expect(delayMinutes('2026-07-21T10:16:00+02:00', '2026-07-21T10:28:00+02:00')).toBe(12);
  });

  it('is undefined without realtime data', () => {
    expect(delayMinutes('2026-07-21T10:16:00+02:00', undefined)).toBeUndefined();
  });
});

describe('fmtDuration', () => {
  it('formats hours and minutes', () => {
    expect(fmtDuration(253)).toBe('4h 13m');
    expect(fmtDuration(45)).toBe('45m');
    expect(fmtDuration(60)).toBe('1h 00m');
  });
});
