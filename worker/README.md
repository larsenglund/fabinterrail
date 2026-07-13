# FabInterrail assistant Worker

A single-file Cloudflare Worker — the app's entire backend. It holds the
Anthropic API key, grounds questions in `shared/knowledge.json` plus the trip
context sent by the app, and calls Claude.

## Deploy (once)

```bash
cd worker
npx wrangler login                          # first time only
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://fabinterrail-assistant.<account>.workers.dev`.

## Point the app at it

Set the URL when starting/building the app:

```bash
EXPO_PUBLIC_ASSISTANT_URL=https://fabinterrail-assistant.<account>.workers.dev npm start
```

(or put it in a local `.env` file — Expo picks up `EXPO_PUBLIC_*` vars.)

Without the URL the app's Ask tab still works from the bundled offline
knowledge base — the Worker only adds full AI answers.

## API

```
POST /
{ "question": "Do I need a reservation from Prague to Vienna?",
  "context": "The user's current trip ..." }

200 { "text": "...", "sources": ["interrail.eu reservation guide", ...] }
```
