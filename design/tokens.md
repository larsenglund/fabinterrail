# FabInterrail design tokens

Direction: **"the timetable is the interface"** — paper & ink, hairline rules,
heavy tabular numerals, one signal accent, indigo reserved for night trains.
Typography is the native platform face (SF Pro / Roboto) — the app should feel
like the phone it runs on. Interactive mockups: `design/mockups.html`.

## Color

| Token | Light | Dark ("night-train mode") | Role |
| --- | --- | --- | --- |
| `paper` | `#FBF9F5` | `#15171F` | ground |
| `field` | `#F3EFE7` | `#1D202B` | input fills, progress tracks |
| `ink` | `#211D16` | `#ECE9E1` | primary text |
| `muted` | `#7A7263` | `#979DAD` | secondary text |
| `hair` | `#E6E0D4` | `#2A2E3B` | hairline rules (replace cards) |
| `signal` | `#C2570A` | `#D07B22` (marks) / `#EDA14E` (text) | THE accent: live/attention, one thing per screen |
| `night` | `#4F46B8` | `#8B84E8` | night trains ONLY |
| `slate` | `#57534A` | `#8A8478` | neutral data marks (Gantt stay bars, budget bars) |
| `good` | `#3D7A44` | `#7FBF87` | on-time / on-budget |
| `danger` | `#B3261E` | `#E58B84` | cancelled / over-budget |

Rules:
- Signal is spent on **one thing per screen** (delay numeral, today marker,
  primary action). Semantic colors are never used as decorative accents.
- Night indigo appears only when a train crosses midnight.
- Data marks (Gantt bars, budget bars) are neutral slate — identity lives in
  row labels, so color is free to mean something (night, warning).
- Dark theme is designed, not inverted; mark colors were validated for
  lightness band, chroma, CVD separation and contrast on both surfaces.

## Type

Native platform stack (`system-ui` → SF Pro on iOS, Roboto on Android).

| Role | Size / weight | Notes |
| --- | --- | --- |
| Display numerals | 34 / 800 | times, money; `tabular-nums`, letter-spacing −0.02em |
| Screen title | 26 / 800 | −0.02em |
| Section title | 22 / 800 | |
| Body | 15 / 400–600 | |
| Secondary | 13 / 400 | muted |
| Label / eyebrow | 11 / 700 | UPPERCASE, +0.08em, muted |
| Codes | 13 mono | booking refs, pass numbers — `ui-monospace` / Menlo |

## Layout

- 8-pt spacing grid: 4 / 8 / 12 / 16 / 24 / 32.
- Radii: 6 (chips, bars) / 10 (fields) / 12 (buttons).
- Hairline rules between list rows instead of cards; flat surfaces.
- Delay states rewrite the time numeral itself in signal (`12:09` + "plan
  12:04 +5"), platform changes flip the platform numeral to signal,
  cancellations strike through.
