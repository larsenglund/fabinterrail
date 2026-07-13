/**
 * FabInterrail assistant Worker — the app's entire backend.
 *
 * Holds the Anthropic API key (a Worker secret, never in the app bundle),
 * grounds each question in the shared knowledge base plus the trip context
 * the app sends, and calls Claude.
 *
 *   POST / { "question": "...", "context": "..." }
 *   → 200 { "text": "...", "sources": ["..."] }
 *
 * Deploy: see worker/README.md (wrangler secret put ANTHROPIC_API_KEY; wrangler deploy).
 */

import knowledge from '../../shared/knowledge.json';

const MODEL = 'claude-sonnet-5';
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 4000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const question = String(body.question ?? '').slice(0, MAX_QUESTION).trim();
    const context = String(body.context ?? '').slice(0, MAX_CONTEXT);
    if (!question) return json({ error: 'question is required' }, 400);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Worker is missing ANTHROPIC_API_KEY' }, 500);

    const entries = retrieve(question, 4);
    const system = buildSystemPrompt(entries, context);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ error: `Upstream error (${res.status})`, detail: detail.slice(0, 200) }, 502);
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text)
      .join('\n');

    return json({ text: text || 'No answer produced.', sources: entries.map((e) => e.source) });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

/** Same naive keyword retrieval as the app's offline mode. */
function retrieve(query, max) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return knowledge.entries
    .map((entry) => {
      let score = 0;
      for (const w of words) {
        if (entry.keywords.some((k) => k.includes(w) || w.includes(k))) score += 3;
        if (entry.topic.toLowerCase().includes(w)) score += 2;
        if (entry.content.toLowerCase().includes(w)) score += 1;
      }
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.entry);
}

function buildSystemPrompt(entries, context) {
  const parts = [
    'You are the in-app travel assistant of FabInterrail, an app for backpacking through Europe ' +
      'by train with an Interrail/Eurail pass. Answer concisely and practically. When rules differ ' +
      'per country or operator, say so. If you are unsure about current prices or availability, say ' +
      'so and point to the authoritative source (interrail.eu, the operator, or seat61.com).',
  ];
  if (entries.length > 0) {
    parts.push(
      'Relevant knowledge base entries:\n' +
        entries.map((e) => `- [${e.source}] ${e.content}`).join('\n'),
    );
  }
  if (context) parts.push(context);
  parts.push(
    'Never invent pass numbers, booking references or realtime data. The app shows realtime ' +
      'departures separately; you may tell the user to check the Board tab for live data.',
  );
  return parts.join('\n\n');
}
