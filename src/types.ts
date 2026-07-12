/**
 * Core domain model for FabInterrail.
 *
 * A Trip is a sequence of Stops (places you stay) connected by Legs
 * (train journeys). Travelers carry passes/tickets/documents. Expenses
 * are shared between travelers and tracked against a budget.
 */

// ---------------------------------------------------------------------------
// Travelers, passes & documents
// ---------------------------------------------------------------------------

export type PassType =
  | 'interrail-global'
  | 'interrail-one-country'
  | 'eurail-global'
  | 'eurail-one-country'
  | 'other';

export interface RailPass {
  id: string;
  type: PassType;
  /** Pass number as printed on the pass / in the Rail Planner app. */
  passNumber: string;
  /** e.g. "7 days within 1 month", "22 days continuous". */
  validity: string;
  travelClass: 1 | 2;
  validFrom?: string; // ISO date
  validTo?: string; // ISO date
  /** Mobile pass or paper pass. */
  format: 'mobile' | 'paper';
  notes?: string;
}

export interface Ticket {
  id: string;
  title: string; // e.g. "Seat reservation Stockholm→Hamburg"
  operator?: string; // e.g. "SJ", "DB", "SNCF"
  reference?: string; // booking/PNR code
  travelerIds: string[];
  legId?: string; // optional link to a trip leg
  date?: string; // ISO date
  price?: Money;
  /** Free-form: coach/seat, QR payload, pickup instructions… */
  notes?: string;
}

export interface Traveler {
  id: string;
  name: string;
  /** Optional personal details, stored only on-device. */
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  dietaryNotes?: string;
  passes: RailPass[];
  color: string; // used in charts / avatars
}

// ---------------------------------------------------------------------------
// Trip structure
// ---------------------------------------------------------------------------

export interface Accommodation {
  id: string;
  name: string; // e.g. "Hostel Aurora"
  kind: 'hotel' | 'hostel' | 'apartment' | 'camping' | 'friends' | 'night-train' | 'other';
  reference?: string; // booking reference
  address?: string;
  checkIn?: string; // ISO datetime
  checkOut?: string; // ISO datetime
  price?: Money;
  bookedBy?: string; // travelerId
  url?: string;
  notes?: string;
}

/** A place where the group stays one or more nights (or a day visit). */
export interface Stop {
  id: string;
  /** Display name, e.g. "Berlin". */
  place: string;
  /** Optional HAFAS station id of the main station, for quick departure boards. */
  stationId?: string;
  stationName?: string;
  arrival: string; // ISO date (or datetime) the group arrives
  departure: string; // ISO date (or datetime) the group leaves
  accommodations: Accommodation[];
  notes?: string;
  color?: string;
}

/** One train (or ferry/bus) journey connecting two stops. */
export interface Leg {
  id: string;
  fromStopId: string;
  toStopId: string;
  /** Human readable, e.g. "Berlin Hbf → København H". */
  summary: string;
  departure: string; // ISO datetime, planned
  arrival: string; // ISO datetime, planned
  /** Line names of each segment, e.g. ["ICE 76", "RE 7"]. */
  trains: string[];
  reservationRequired?: boolean;
  reservationIds?: string[]; // Ticket ids
  isNightTrain?: boolean;
  /** Raw journey payload from the transport API, kept for refresh/details. */
  refreshToken?: string;
  notes?: string;
}

export interface Trip {
  id: string;
  name: string;
  travelerIds: string[];
  stops: Stop[];
  legs: Leg[];
  /** Overall budget for the trip. */
  budget?: Money;
  currency: string; // default currency, e.g. "EUR"
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Money, expenses & cost sharing
// ---------------------------------------------------------------------------

export interface Money {
  amount: number; // in major units (e.g. euros, not cents)
  currency: string; // ISO 4217, e.g. "EUR"
}

export type ExpenseCategory =
  | 'transport'
  | 'reservations'
  | 'accommodation'
  | 'food'
  | 'activities'
  | 'other';

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  category: ExpenseCategory;
  amount: Money;
  /** Who paid. */
  paidBy: string; // travelerId
  /** Who shares the cost (equal split among these). */
  sharedBy: string[]; // travelerIds
  date: string; // ISO date
  stopId?: string;
  notes?: string;
}

/** Net balance for one traveler: positive = is owed money. */
export interface Balance {
  travelerId: string;
  net: number;
}

/** A settlement instruction: `from` pays `to` `amount`. */
export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Transport API (HAFAS / transport.rest) view models
// ---------------------------------------------------------------------------

export interface Station {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  /** Products served, e.g. nationalExpress, regional… */
  products?: Record<string, boolean>;
}

export interface Departure {
  tripId: string;
  line: string; // e.g. "ICE 690"
  direction: string;
  plannedWhen: string; // ISO datetime
  when?: string; // realtime, if available
  delayMinutes?: number;
  platform?: string;
  plannedPlatform?: string;
  cancelled?: boolean;
  remarks: string[];
}

export interface JourneyLegVM {
  origin: string;
  destination: string;
  departure: string;
  plannedDeparture: string;
  arrival: string;
  plannedArrival: string;
  line?: string; // undefined for walking transfers
  direction?: string;
  departurePlatform?: string;
  arrivalPlatform?: string;
  cancelled?: boolean;
}

export interface JourneyVM {
  id: string; // refreshToken or synthetic id
  legs: JourneyLegVM[];
  departure: string;
  arrival: string;
  transfers: number;
  durationMinutes: number;
  refreshToken?: string;
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** Which live data / knowledge sources were injected into this answer. */
  sources?: string[];
}
