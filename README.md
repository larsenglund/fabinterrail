# FabInterrail 🚆

A mobile app for backpacking through Europe by train (Interrail/Eurail):
pan-European timetables & realtime data, trip planning with a Gantt-style
timeline, traveler & pass management, cost sharing, budget follow-up, and an
AI travel assistant grounded in community rail knowledge.

Built with **Expo / React Native / TypeScript** — one codebase for iOS,
Android and web.

> **Status:** the code here is a working spike. The reviewed plan, tech-stack
> decisions, design direction and phased roadmap live in **[PLAN.md](PLAN.md)**
> — that document is the source of truth for where the project is going.

## Features (spike)

| Tab | What it does |
| --- | --- |
| **Trip** | Create trips, add stops with arrival/departure dates and accommodation bookings (name, reference, price). The whole plan renders as a horizontal **Gantt timeline**: one bar per stop (nights, bed/no-bed warning), a travel row with all train legs (night trains highlighted), and a "today" marker. |
| **Trains** | Journey search between any two European stations with realtime delays, platforms and cancellations. One tap adds a journey to the active trip as a leg. |
| **Departures** | Live departure board for any station — realtime delays, platform changes, disruption remarks. Quick chips for your trip's stops. Pull to refresh. |
| **Travelers** | The group's people: personal details (passport, DOB, phone, emergency contact), **Interrail/Eurail pass numbers** and validity. Everything is stored only on-device. |
| **Budget** | Shared expenses with "paid by" / "split between" per expense, per-traveler balances, a minimal **settlement plan** (who pays whom), spend by category, and budget-vs-actual follow-up with a progress bar. |
| **Assistant** | Chat assistant for pass rules, reservations, night trains, budgets. Grounded in a curated knowledge base + your live trip context. Works offline; add an Anthropic API key in its settings for full AI answers. |

## Getting started

```bash
npm install
npm start          # Expo dev server — scan the QR with Expo Go
npm run web        # or run in the browser
npm run typecheck  # tsc --noEmit
```

## Architecture

```
App.tsx                    bottom-tab navigation shell
src/
  types.ts                 domain model (Trip, Stop, Leg, Traveler, RailPass,
                           Ticket, Accommodation, Expense, …)
  theme.ts                 colors & spacing
  api/transport.ts         HAFAS client (v6.db.transport.rest): station search,
                           departure boards, journey search, journey refresh
  services/knowledge.ts    curated Interrail knowledge base + keyword retrieval
  services/assistant.ts    assistant orchestration: retrieval + trip context +
                           optional Claude API call
  store/appStore.ts        single persisted zustand store (AsyncStorage)
  components/              GanttChart, StationPicker, shared UI primitives
  screens/                 one file per tab
```

### Live train data

The MVP uses the community [`v6.db.transport.rest`](https://v6.db.transport.rest)
HAFAS proxy. Deutsche Bahn's HAFAS carries timetables — and realtime data
where operators provide it — for long-distance and much regional traffic
across most of Europe, which makes it a good single starting backend.
`src/api/transport.ts` maps everything to app-level view models
(`Station`, `Departure`, `JourneyVM`), so additional national sources can be
added behind the same interface:

- 🇸🇪 Trafiklab / Resrobot (Sweden, incl. SJ realtime)
- 🇫🇷 SNCF open API, 🇳🇱 NS API, 🇦🇹 ÖBB, 🇨🇭 opentransportdata.swiss
- 🇮🇹 Trenitalia/Italo, 🇪🇸 Renfe (community endpoints)

### Community knowledge & the assistant

The assistant grounds its answers in:

1. A **curated knowledge base** (`src/services/knowledge.ts`) seeded with
   pass rules, reservation requirements per country, night-train travel-day
   rules, booking channels (e.g. SJ/Snälltåget passholder reservations),
   budgets and safety tips.
2. **Your trip context** — stops, legs, travelers and passes are injected
   into the prompt so answers are specific ("your Berlin→Copenhagen leg…").
3. Optionally, the **Claude API** (key stored on-device, entered in the
   Assistant tab) for full natural-language answers.

**About the Tågsemester Facebook group**: scraping a private Facebook group
violates Facebook's ToS and members' expectations, so the app does not do
that. The intended path for incorporating that community's knowledge is a
server-side ingestion pipeline fed by *permitted* sources: FAQ documents the
group admins publish/export voluntarily, plus public sources like operator
FAQs, interrail.eu conditions and The Man in Seat 61. Distilled Q&A entries
land in the same knowledge-base format the assistant already consumes.

## Privacy

Personal data (names, passports, pass numbers, bookings, expenses) is stored
only on the device via AsyncStorage. Network calls are limited to the
transport API (station/journey queries) and, only if you opt in with your own
key, the Anthropic API.

## Roadmap

See **[PLAN.md](PLAN.md)** for the phased plan (design system & mockups →
core hardening → assistant backend → depth features), the risk register and
what's explicitly cut from v1.
