# FabInterrail — Plan & Architecture Decisions

*Last updated: 2026-07-12. This is the living plan for the project. The code
currently on this branch is a working spike that predates this plan; it is
kept as scaffolding and will be restyled/hardened per the phases below.*

## Product vision

A mobile app for backpacking through Europe by train (Interrail/Eurail):

- Timetables, realtime train data and station departure boards across Europe
- Store passes, tickets, personal info for multiple travelers, and
  accommodation bookings
- Plan and visualize the whole trip Gantt-style, stayovers included
- Cost sharing between travelers + budget & follow-up
- An assistant that answers train/ticket/pass questions using community
  knowledge (Tågsemester-style distilled wisdom) combined with the app's
  live data

## Guiding principles

1. **Lean** — fewest dependencies and moving parts that can deliver the
   feature. No component framework, no chart library, no state framework
   beyond zustand.
2. **Local-first** — personal data (travelers, passes, bookings, expenses)
   never leaves the device. No accounts, no user database, no sync service
   in v1.
3. **Replaceable seams** — the two volatile externalities (train-data APIs,
   AI/knowledge) sit behind thin interfaces so they can be swapped without
   touching UI code.
4. **Easy deploy** — Expo Go during development; EAS Build for stores; EAS
   Update for OTA JS fixes. The only server component is a single
   Cloudflare Worker (Phase 2), deployed with `wrangler deploy`.

## Tech stack

| Concern | Choice | Why / notes |
| --- | --- | --- |
| App framework | Expo SDK 53+ / React Native / TypeScript (strict) | One codebase for iOS + Android (+ web free). Cloud builds via EAS, no local native toolchain. |
| Navigation | react-navigation bottom tabs | 6 flat tabs; file-based routing (expo-router) adds convention overhead for no gain here. |
| State | Single zustand store, persisted | Add a **schema `version` + migrate function** before first real users. |
| Storage | AsyncStorage for app data; **expo-secure-store** for passports & pass numbers | Sensitive fields belong in Keychain/Keystore. |
| Dates | dayjs + native date picker (`@react-native-community/datetimepicker`) | Replaces the spike's raw ISO text inputs. |
| UI | **Custom design system** (see Design) — tokens file + ~10 primitives, Reanimated (bundled with Expo) for restrained motion | No Tamagui/Paper: weight, lock-in, stock look. Perf from discipline: FlatList, memoized rows, no heavy deps. |
| Train data | `v6.db.transport.rest` (HAFAS community proxy) behind an adapter in `src/api/transport.ts` | See risk R1. Free, keyless, one API covering most of Europe. |
| Assistant | Offline curated knowledge base in-app; Claude API via one Cloudflare Worker (Phase 2) | No BYO-API-key UX; key lives in the Worker. |
| Quality | ESLint + Prettier, `tsc --noEmit`, vitest on pure logic (money settlement, date math), GitHub Action CI | Nothing more. |

## Design ("Claude design")

Direction: **editorial and calm**. Generous whitespace, an 8pt spacing grid,
large numerals for times and prices (timetable aesthetic), flat surfaces with
hairline dividers instead of heavy cards, one warm accent color, full light +
dark themes. The Gantt timeline is the visual centerpiece of the Trip tab;
night trains get a distinct visual moment. Motion is subtle and functional
(press feedback, list transitions), built on Reanimated only.

Deliverable before any UI rebuild (Phase 0): clickable **HTML mockups of the
4 key screens** (Trip/Gantt, journey search, departure board, budget) for
review on a phone, plus the design tokens file. UI work starts only after the
direction is approved.

## Risks & mitigations

- **R1 — Train-data dependency.** Community APIs have no SLA. *This risk
  materialized 2026-07: `v6.db.transport.rest` went down (503s) and the
  primary backend was swapped to [Transitous](https://transitous.org)
  (MOTIS, pan-European GTFS/GTFS-RT) — only `src/api/transport.ts` changed.*
  *Mitigation:* keep the adapter interface thin and app-facing view-models
  stable; add client-side TTL caching (station search ≈ forever, boards ≈
  60s, journeys ≈ on-demand); Phase 3 can add a caching proxy + national
  sources (Trafiklab 🇸🇪, SNCF 🇫🇷, ÖBB 🇦🇹, …) behind the same interface
  without app updates.
- **R2 — Knowledge/datamining scope trap.** Scraping the Tågsemester
  Facebook group is not viable (Facebook ToS, private group). A live
  ingestion pipeline is a second product.
  *Mitigation:* a curated knowledge file (distilled community wisdom:
  reservation rules per country, booking channels, night-train tricks) that
  grows by pull request. The Worker feeds it to Claude with the user's trip
  context. A real ingestion service can slot in later without app changes.
- **R3 — Store schema drift.** Persisted local data + evolving models =
  corrupted installs. *Mitigation:* versioned store with migrations from
  day one.

## Phases

### Phase 0 — Design
- [x] Design tokens (`design/tokens.md`) — validated light/dark palettes
- [x] Clickable HTML mockups (`design/mockups.html`): Trip/Gantt, Trains,
      Departures, Budget
- [x] Review & approval gate — **approved 2026-07-13**

### Phase 1 — Core app
- [x] Apply design system across all screens (theme tokens in `src/theme.ts`,
      primitives in `src/components/ui.tsx`)
- [x] Native date pickers (iOS/Android; ISO text fallback on web)
- [x] expo-secure-store vault for passports & pass numbers
- [x] Store schema version + migration hook
- [x] TTL caching in the transport adapter
- [x] ESLint/Prettier, vitest for money/date logic, CI (typecheck + lint + test)

### Phase 2 — Assistant
- [x] Cloudflare Worker (`worker/`): holds Anthropic key, merges
      `shared/knowledge.json` + trip context, calls Claude; app makes one
      fetch to `EXPO_PUBLIC_ASSISTANT_URL` (deploy: `worker/README.md`)
- [x] Removed BYO-key UI (store schema v2 migration drops the old key);
      offline knowledge base remains the no-network path
- [ ] Grow curated knowledge file (Tågsemester-style distilled Q&A) — ongoing,
      by pull request against `shared/knowledge.json`

### Phase 3 — Depth, by demand
- [ ] Ticket wallet (QR/PDF attachments, offline viewing)
- [ ] Saved-leg auto-refresh + delay/platform alerts
- [ ] Multi-currency expenses with conversion
- [ ] Trip sharing/sync between travelers
- [ ] Additional data providers behind the adapter; caching proxy
- [ ] Map view of the route

## Explicitly cut from v1

Accounts/sync, maps, push notifications, web scraping, multi-backend
routing. Each can be added later without rework thanks to the adapter and
Worker seams.
