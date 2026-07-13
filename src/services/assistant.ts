/**
 * The travel assistant answers free-form questions ("Do I need a reservation
 * from Prague to Vienna?", "How do night trains count against my pass?").
 *
 * Grounding strategy:
 *  1. Build the user's live trip context (stops, legs, travelers, passes).
 *  2. If an assistant Worker URL is configured (EXPO_PUBLIC_ASSISTANT_URL,
 *     see worker/README.md), send question + context there — the Worker
 *     holds the API key and calls Claude.
 *  3. Without a Worker, answer offline from the bundled knowledge base.
 */

import { type Traveler, type Trip } from '../types';
import { fmtDate } from '../utils/date';
import { retrieve } from './knowledge';

const ASSISTANT_URL = process.env.EXPO_PUBLIC_ASSISTANT_URL;

export const assistantOnline = Boolean(ASSISTANT_URL);

export interface AssistantAnswer {
  text: string;
  sources: string[];
}

export interface AssistantContext {
  trip?: Trip;
  travelers: Traveler[];
}

export async function askAssistant(
  question: string,
  ctx: AssistantContext,
): Promise<AssistantAnswer> {
  if (ASSISTANT_URL) {
    const res = await fetch(ASSISTANT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, context: buildContext(ctx) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Assistant request failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AssistantAnswer;
    return { text: data.text ?? 'No answer produced.', sources: data.sources ?? [] };
  }

  // Offline mode: answer directly from the bundled knowledge base.
  const entries = retrieve(question, 4);
  if (entries.length === 0) {
    return {
      text:
        'I could not find anything about that in the offline knowledge base. ' +
        'Connect the assistant Worker (see worker/README.md) for full AI answers.',
      sources: [],
    };
  }
  return {
    text: entries.map((e) => `${e.topic}\n${e.content}`).join('\n\n'),
    sources: entries.map((e) => e.source),
  };
}

function buildContext(ctx: AssistantContext): string {
  const parts: string[] = [];
  if (ctx.trip) {
    const stops = ctx.trip.stops
      .map((s) => `${s.place} (${fmtDate(s.arrival)} → ${fmtDate(s.departure)})`)
      .join(', ');
    const legs = ctx.trip.legs.map((l) => l.summary).join('; ');
    parts.push(
      `The user's current trip "${ctx.trip.name}": stops: ${stops || 'none yet'}. Booked legs: ${legs || 'none yet'}.`,
    );
  }
  if (ctx.travelers.length > 0) {
    const t = ctx.travelers
      .map((tr) => `${tr.name}${tr.passes[0] ? ` (${tr.passes[0].type}, ${tr.passes[0].validity})` : ''}`)
      .join(', ');
    parts.push(`Travelers: ${t}. Do not repeat personal details back unless asked.`);
  }
  return parts.join('\n');
}
