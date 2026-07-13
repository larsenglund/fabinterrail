/**
 * Train-data client, backed by Transitous (api.transitous.org) — a
 * community-run MOTIS instance aggregating public GTFS/GTFS-RT feeds for all
 * of Europe. Keyless, CORS-enabled, actively maintained.
 *
 * History: the app originally used the HAFAS proxy v6.db.transport.rest,
 * which went down (503s) in July 2026 — the exact R1 risk in PLAN.md. The
 * app-facing view-models (Station, Departure, JourneyVM) are backend-neutral,
 * so this file is the only thing that changed in the swap, and additional
 * national sources can still be added behind the same interface.
 */

import { type Departure, type JourneyLegVM, type JourneyVM, type Station } from '../types';
import { delayMinutes } from '../utils/date';

const BASE = 'https://api.transitous.org/api';

/**
 * In-memory TTL cache. The backend is a donation-funded community service,
 * so be a good citizen: station lookups rarely change (long TTL), boards and
 * journeys are realtime (short TTL, still deduplicates rapid re-queries).
 */
const TTL = {
  stations: 24 * 60 * 60_000,
  departures: 60_000,
  journeys: 30_000,
} as const;

const cache = new Map<string, { expires: number; data: unknown }>();

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const data = await fetcher();
  cache.set(key, { expires: Date.now() + ttlMs, data });
  if (cache.size > 300) {
    for (const [k, v] of cache) {
      if (v.expires <= Date.now()) cache.delete(k);
    }
  }
  return data;
}

async function get<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await fetch(`${BASE}${path}?${qs}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`transitous ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// --- raw MOTIS shapes (only the fields we consume) --------------------------

interface RawGeocodeMatch {
  type: string; // STOP | ADDRESS | PLACE
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  country?: string;
  areas?: { name: string; default?: boolean }[];
}

interface RawPlace {
  name?: string;
  stopId?: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled?: boolean;
}

interface RawStopTime {
  place: RawPlace;
  mode?: string;
  realTime?: boolean;
  headsign?: string;
  displayName?: string;
  routeShortName?: string;
  tripId?: string;
  agencyName?: string;
}

interface RawLeg {
  mode?: string; // WALK | HIGHSPEED_RAIL | REGIONAL_RAIL | NIGHT_RAIL | …
  from: RawPlace;
  to: RawPlace;
  headsign?: string;
  displayName?: string;
  routeShortName?: string;
  cancelled?: boolean;
}

interface RawItinerary {
  duration: number; // seconds
  startTime: string;
  endTime: string;
  transfers: number;
  legs: RawLeg[];
}

// --- public API -------------------------------------------------------------

/** Fuzzy station search across all of Europe. */
export async function searchStations(query: string, limit = 8): Promise<Station[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const raw = await cached(`loc:${q.toLowerCase()}`, TTL.stations, () =>
    get<RawGeocodeMatch[]>('/v1/geocode', { text: q, type: 'STOP' }),
  );
  return raw
    .filter((m) => m.type === 'STOP' && m.id && m.name)
    .slice(0, limit)
    .map((m) => {
      const area = m.areas?.find((a) => a.default)?.name;
      return {
        id: m.id,
        name: area && !m.name.includes(area) ? `${m.name}, ${area}` : m.name,
        latitude: m.lat,
        longitude: m.lon,
      };
    });
}

/** Live departure board with realtime delays, platforms and cancellations. */
export async function getDepartures(stationId: string, _durationMin = 120): Promise<Departure[]> {
  const raw = await cached(`dep:${stationId}`, TTL.departures, () =>
    get<{ stopTimes: RawStopTime[] }>('/v1/stoptimes', {
      stopId: stationId,
      n: 30,
      arriveBy: false,
    }),
  );
  return (raw.stopTimes ?? [])
    .filter((st) => st.place.scheduledDeparture || st.place.departure)
    .map((st) => {
      const planned = st.place.scheduledDeparture ?? st.place.departure!;
      const rt = st.realTime ? (st.place.departure ?? undefined) : undefined;
      return {
        tripId: st.tripId ?? '',
        line: st.displayName ?? st.routeShortName ?? st.mode ?? '?',
        direction: st.headsign ?? '',
        plannedWhen: planned,
        when: rt,
        delayMinutes: delayMinutes(planned, rt),
        platform: st.place.track ?? undefined,
        plannedPlatform: st.place.scheduledTrack ?? undefined,
        cancelled: st.place.cancelled,
        remarks: [],
      };
    });
}

export interface JourneyQuery {
  fromId: string;
  toId: string;
  departure?: Date;
  results?: number;
}

/** Door-to-door rail journeys between two stations. */
export async function searchJourneys(q: JourneyQuery): Promise<JourneyVM[]> {
  const params: Record<string, string | number | boolean> = {
    fromPlace: q.fromId,
    toPlace: q.toId,
    transitModes: 'RAIL',
    numItineraries: q.results ?? 6,
  };
  if (q.departure) params.time = q.departure.toISOString();

  const raw = await cached(
    `jny:${q.fromId}:${q.toId}:${params.time ?? 'now'}`,
    TTL.journeys,
    () => get<{ itineraries: RawItinerary[] }>('/v3/plan', params),
  );
  return (raw.itineraries ?? []).map(toJourneyVM).filter((j): j is JourneyVM => j !== null);
}

function toJourneyVM(it: RawItinerary): JourneyVM | null {
  const legs: JourneyLegVM[] = (it.legs ?? [])
    .map((l): JourneyLegVM | null => {
      const walking = l.mode === 'WALK';
      const departure = l.from.departure ?? l.from.scheduledDeparture;
      const arrival = l.to.arrival ?? l.to.scheduledArrival;
      if (!departure || !arrival) return null;
      return {
        origin: l.from.name ?? '?',
        destination: l.to.name ?? '?',
        departure,
        plannedDeparture: l.from.scheduledDeparture ?? departure,
        arrival,
        plannedArrival: l.to.scheduledArrival ?? arrival,
        line: walking ? undefined : (l.displayName ?? l.routeShortName ?? l.mode),
        direction: l.headsign ?? undefined,
        departurePlatform: l.from.track ?? l.from.scheduledTrack ?? undefined,
        arrivalPlatform: l.to.track ?? l.to.scheduledTrack ?? undefined,
        cancelled: l.cancelled || l.from.cancelled,
      };
    })
    .filter((l): l is JourneyLegVM => l !== null);
  if (legs.length === 0) return null;

  const trainLegs = legs.filter((l) => l.line);
  return {
    id: `${it.startTime}-${it.endTime}-${it.transfers}`,
    legs,
    departure: it.startTime,
    arrival: it.endTime,
    transfers: it.transfers ?? Math.max(0, trainLegs.length - 1),
    durationMinutes: Math.round(it.duration / 60),
  };
}
