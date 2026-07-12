/**
 * Client for the community HAFAS proxy `v6.db.transport.rest`.
 *
 * The Deutsche Bahn HAFAS endpoint knows far more than Germany: it carries
 * timetables and (where available) realtime data for long-distance and many
 * regional trains across most of Europe — which makes it a good single
 * starting point for an Interrail app. The client is written against a small
 * interface so additional national backends (SNCF, Trafiklab/Resrobot, NS,
 * ÖBB, Trenitalia…) can be added behind the same view-models later.
 */

import type { Departure, JourneyLegVM, JourneyVM, Station } from '../types';
import { delayMinutes } from '../utils/date';

const BASE = 'https://v6.db.transport.rest';

async function get<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`transport.rest ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// --- raw HAFAS shapes (only the fields we consume) -------------------------

interface RawLocation {
  type: string;
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  location?: { latitude?: number; longitude?: number };
  products?: Record<string, boolean>;
}

interface RawStopover {
  tripId?: string;
  direction?: string | null;
  line?: { name?: string } | null;
  when?: string | null;
  plannedWhen?: string | null;
  platform?: string | null;
  plannedPlatform?: string | null;
  cancelled?: boolean;
  remarks?: { text?: string; summary?: string }[];
}

interface RawLeg {
  origin?: { name?: string };
  destination?: { name?: string };
  departure?: string | null;
  plannedDeparture?: string | null;
  arrival?: string | null;
  plannedArrival?: string | null;
  departurePlatform?: string | null;
  arrivalPlatform?: string | null;
  line?: { name?: string } | null;
  direction?: string | null;
  walking?: boolean;
  cancelled?: boolean;
}

interface RawJourney {
  type: string;
  legs: RawLeg[];
  refreshToken?: string;
}

// --- public API -------------------------------------------------------------

/** Fuzzy search for stations across the network. */
export async function searchStations(query: string, limit = 8): Promise<Station[]> {
  if (query.trim().length < 2) return [];
  const raw = await get<RawLocation[]>('/locations', {
    query: query.trim(),
    results: limit,
    stops: true,
    addresses: false,
    poi: false,
  });
  return raw
    .filter((l) => (l.type === 'stop' || l.type === 'station') && l.id && l.name)
    .map((l) => ({
      id: l.id!,
      name: l.name!,
      latitude: l.latitude ?? l.location?.latitude,
      longitude: l.longitude ?? l.location?.longitude,
      products: l.products,
    }));
}

/** Live departure board for a station, with realtime delays. */
export async function getDepartures(stationId: string, durationMin = 120): Promise<Departure[]> {
  const raw = await get<{ departures: RawStopover[] }>(
    `/stops/${encodeURIComponent(stationId)}/departures`,
    { duration: durationMin, results: 30, remarks: true },
  );
  return (raw.departures ?? [])
    .filter((d) => d.plannedWhen || d.when)
    .map((d) => ({
      tripId: d.tripId ?? '',
      line: d.line?.name ?? '?',
      direction: d.direction ?? '',
      plannedWhen: d.plannedWhen ?? d.when!,
      when: d.when ?? undefined,
      delayMinutes: delayMinutes(d.plannedWhen ?? undefined, d.when ?? undefined),
      platform: d.platform ?? undefined,
      plannedPlatform: d.plannedPlatform ?? undefined,
      cancelled: d.cancelled,
      remarks: (d.remarks ?? [])
        .map((r) => r.text ?? r.summary ?? '')
        .filter((t) => t.length > 0)
        .slice(0, 3),
    }));
}

export interface JourneyQuery {
  fromId: string;
  toId: string;
  departure?: Date;
  results?: number;
}

/** Door-to-door journey options between two stations. */
export async function searchJourneys(q: JourneyQuery): Promise<JourneyVM[]> {
  const params: Record<string, string | number | boolean> = {
    from: q.fromId,
    to: q.toId,
    results: q.results ?? 6,
    stopovers: false,
  };
  if (q.departure) params.departure = q.departure.toISOString();

  const raw = await get<{ journeys: RawJourney[] }>('/journeys', params);
  return (raw.journeys ?? []).map(toJourneyVM).filter((j): j is JourneyVM => j !== null);
}

/** Refresh a previously found journey to pull current realtime data. */
export async function refreshJourney(refreshToken: string): Promise<JourneyVM | null> {
  const raw = await get<{ journey: RawJourney }>(
    `/journeys/${encodeURIComponent(refreshToken)}`,
    {},
  );
  return raw.journey ? toJourneyVM(raw.journey) : null;
}

function toJourneyVM(j: RawJourney): JourneyVM | null {
  const legs: JourneyLegVM[] = (j.legs ?? [])
    .filter((l) => l.plannedDeparture || l.departure)
    .map((l) => ({
      origin: l.origin?.name ?? '?',
      destination: l.destination?.name ?? '?',
      departure: l.departure ?? l.plannedDeparture!,
      plannedDeparture: l.plannedDeparture ?? l.departure!,
      arrival: l.arrival ?? l.plannedArrival ?? l.plannedDeparture!,
      plannedArrival: l.plannedArrival ?? l.arrival ?? l.plannedDeparture!,
      line: l.walking ? undefined : (l.line?.name ?? undefined),
      direction: l.direction ?? undefined,
      departurePlatform: l.departurePlatform ?? undefined,
      arrivalPlatform: l.arrivalPlatform ?? undefined,
      cancelled: l.cancelled,
    }));
  if (legs.length === 0) return null;

  const departure = legs[0].departure;
  const arrival = legs[legs.length - 1].arrival;
  const trainLegs = legs.filter((l) => l.line);
  return {
    id: j.refreshToken ?? `${departure}-${arrival}`,
    legs,
    departure,
    arrival,
    transfers: Math.max(0, trainLegs.length - 1),
    durationMinutes: Math.round((Date.parse(arrival) - Date.parse(departure)) / 60000),
    refreshToken: j.refreshToken,
  };
}
