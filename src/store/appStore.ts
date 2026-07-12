/**
 * Single persisted zustand store for all local data.
 * Everything is stored on-device via AsyncStorage; nothing leaves the phone
 * except transport-API queries and (opt-in) assistant questions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  Accommodation,
  ChatMessage,
  Expense,
  Leg,
  RailPass,
  Stop,
  Traveler,
  Trip,
} from '../types';
import { travelerPalette } from '../theme';
import { uid } from '../utils/id';

interface AppState {
  trips: Trip[];
  activeTripId?: string;
  travelers: Traveler[];
  expenses: Expense[];
  chat: ChatMessage[];
  anthropicApiKey?: string;

  // trips & stops
  createTrip: (name: string, currency: string) => Trip;
  setActiveTrip: (id: string) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  addStop: (tripId: string, stop: Omit<Stop, 'id' | 'accommodations'>) => void;
  updateStop: (tripId: string, stopId: string, patch: Partial<Stop>) => void;
  removeStop: (tripId: string, stopId: string) => void;
  addAccommodation: (tripId: string, stopId: string, acc: Omit<Accommodation, 'id'>) => void;
  removeAccommodation: (tripId: string, stopId: string, accId: string) => void;
  addLeg: (tripId: string, leg: Omit<Leg, 'id'>) => void;
  removeLeg: (tripId: string, legId: string) => void;

  // travelers & passes
  addTraveler: (name: string) => Traveler;
  updateTraveler: (id: string, patch: Partial<Traveler>) => void;
  removeTraveler: (id: string) => void;
  addPass: (travelerId: string, pass: Omit<RailPass, 'id'>) => void;
  removePass: (travelerId: string, passId: string) => void;

  // expenses
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;

  // assistant
  pushChat: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  clearChat: () => void;
  setAnthropicApiKey: (key?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: undefined,
      travelers: [],
      expenses: [],
      chat: [],
      anthropicApiKey: undefined,

      createTrip: (name, currency) => {
        const trip: Trip = {
          id: uid('trip-'),
          name,
          currency,
          travelerIds: get().travelers.map((t) => t.id),
          stops: [],
          legs: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ trips: [...s.trips, trip], activeTripId: trip.id }));
        return trip;
      },
      setActiveTrip: (id) => set({ activeTripId: id }),
      updateTrip: (id, patch) =>
        set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          expenses: s.expenses.filter((e) => e.tripId !== id),
          activeTripId: s.activeTripId === id ? s.trips.find((t) => t.id !== id)?.id : s.activeTripId,
        })),

      addStop: (tripId, stop) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  stops: sortStops([...t.stops, { ...stop, id: uid('stop-'), accommodations: [] }]),
                }
              : t,
          ),
        })),
      updateStop: (tripId, stopId, patch) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  stops: sortStops(
                    t.stops.map((st) => (st.id === stopId ? { ...st, ...patch } : st)),
                  ),
                }
              : t,
          ),
        })),
      removeStop: (tripId, stopId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  stops: t.stops.filter((st) => st.id !== stopId),
                  legs: t.legs.filter((l) => l.fromStopId !== stopId && l.toStopId !== stopId),
                }
              : t,
          ),
        })),

      addAccommodation: (tripId, stopId, acc) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  stops: t.stops.map((st) =>
                    st.id === stopId
                      ? { ...st, accommodations: [...st.accommodations, { ...acc, id: uid('acc-') }] }
                      : st,
                  ),
                }
              : t,
          ),
        })),
      removeAccommodation: (tripId, stopId, accId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  stops: t.stops.map((st) =>
                    st.id === stopId
                      ? { ...st, accommodations: st.accommodations.filter((a) => a.id !== accId) }
                      : st,
                  ),
                }
              : t,
          ),
        })),

      addLeg: (tripId, leg) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, legs: [...t.legs, { ...leg, id: uid('leg-') }] } : t,
          ),
        })),
      removeLeg: (tripId, legId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, legs: t.legs.filter((l) => l.id !== legId) } : t,
          ),
        })),

      addTraveler: (name) => {
        const idx = get().travelers.length;
        const traveler: Traveler = {
          id: uid('trav-'),
          name,
          passes: [],
          color: travelerPalette[idx % travelerPalette.length],
        };
        set((s) => ({
          travelers: [...s.travelers, traveler],
          trips: s.trips.map((t) =>
            t.id === s.activeTripId ? { ...t, travelerIds: [...t.travelerIds, traveler.id] } : t,
          ),
        }));
        return traveler;
      },
      updateTraveler: (id, patch) =>
        set((s) => ({
          travelers: s.travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTraveler: (id) =>
        set((s) => ({
          travelers: s.travelers.filter((t) => t.id !== id),
          trips: s.trips.map((t) => ({
            ...t,
            travelerIds: t.travelerIds.filter((tid) => tid !== id),
          })),
        })),
      addPass: (travelerId, pass) =>
        set((s) => ({
          travelers: s.travelers.map((t) =>
            t.id === travelerId ? { ...t, passes: [...t.passes, { ...pass, id: uid('pass-') }] } : t,
          ),
        })),
      removePass: (travelerId, passId) =>
        set((s) => ({
          travelers: s.travelers.map((t) =>
            t.id === travelerId ? { ...t, passes: t.passes.filter((p) => p.id !== passId) } : t,
          ),
        })),

      addExpense: (expense) =>
        set((s) => ({ expenses: [...s.expenses, { ...expense, id: uid('exp-') }] })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      pushChat: (msg) =>
        set((s) => ({
          chat: [...s.chat, { ...msg, id: uid('msg-'), createdAt: new Date().toISOString() }],
        })),
      clearChat: () => set({ chat: [] }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key || undefined }),
    }),
    {
      name: 'fabinterrail-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => a.arrival.localeCompare(b.arrival));
}

export function useActiveTrip(): Trip | undefined {
  return useAppStore((s) => s.trips.find((t) => t.id === s.activeTripId));
}
