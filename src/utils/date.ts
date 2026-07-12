import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
dayjs.extend(minMax);

export { dayjs };

export function fmtTime(iso?: string): string {
  return iso ? dayjs(iso).format('HH:mm') : '–';
}

export function fmtDate(iso?: string): string {
  return iso ? dayjs(iso).format('ddd D MMM') : '–';
}

export function fmtDateTime(iso?: string): string {
  return iso ? dayjs(iso).format('ddd D MMM HH:mm') : '–';
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

/** Whole days between two ISO dates (at least 0). */
export function nightsBetween(arrival: string, departure: string): number {
  return Math.max(0, dayjs(departure).startOf('day').diff(dayjs(arrival).startOf('day'), 'day'));
}

/** Delay in minutes between planned and realtime ISO datetimes. */
export function delayMinutes(planned?: string, realtime?: string): number | undefined {
  if (!planned || !realtime) return undefined;
  return dayjs(realtime).diff(dayjs(planned), 'minute');
}
