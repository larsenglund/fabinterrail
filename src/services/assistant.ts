/**
 * The travel assistant answers free-form questions ("Do I need a reservation
 * from Prague to Vienna?", "How do night trains count against my pass?").
 *
 * Grounding strategy:
 *  1. Retrieve matching entries from the curated knowledge base.
 *  2. Inject the user's live trip context (stops, legs, travelers, passes).
 *  3. If an Anthropic API key is configured in Settings, ask Claude with all
 *     of that as context. Without a key, fall back to returning the matched
 *     knowledge entries directly so the assistant is still useful offline.
 */

import type { Traveler, Trip } from '../types';
import { fmtDate } from '../utils/date';
import { retrieve } from './knowledge';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export interface AssistantAnswer {
  text: string;
  sources: string[];
}

export interface AssistantContext {
  trip?: Trip;
  travelers: Traveler[];
  apiKey?: string;
}

export async function askAssistant(
  question: string,
  ctx: AssistantContext,
): Promise<AssistantAnswer> {
  const entries = retrieve(question, 4);
  const sources = entries.map((e) => e.source);

  if (!ctx.apiKey) {
    if (entries.length === 0) {
      return {
        text:
          'I could not find anything about that in the offline knowledge base. ' +
          'Add an Anthropic API key in Settings to enable full AI answers.',
        sources: [],
      };
    }
    const text = entries
      .map((e) => `**${e.topic}**\n${e.content}\n_Source: ${e.source}_`)
      .join('\n\n');
    return { text, sources };
  }

  const system = buildSystemPrompt(ctx, entries.map((e) => `- [${e.source}] ${e.content}`));

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ctx.apiKey,
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
    const body = await res.text().catch(() => '');
    throw new Error(`Assistant request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n');
  return { text: text || 'No answer produced.', sources };
}

function buildSystemPrompt(ctx: AssistantContext, knowledge: string[]): string {
  const parts: string[] = [
    'You are the in-app travel assistant of FabInterrail, an app for backpacking through Europe ' +
      'by train with an Interrail/Eurail pass. Answer concisely and practically. When rules differ ' +
      'per country or operator, say so. If you are unsure about current prices or availability, say ' +
      'so and point to the authoritative source (interrail.eu, the operator, or seat61.com).',
  ];

  if (knowledge.length > 0) {
    parts.push('Relevant knowledge base entries:\n' + knowledge.join('\n'));
  }

  if (ctx.trip) {
    const stops = ctx.trip.stops
      .map((s) => `${s.place} (${fmtDate(s.arrival)} → ${fmtDate(s.departure)})`)
      .join(', ');
    const legs = ctx.trip.legs.map((l) => l.summary).join('; ');
    parts.push(`The user's current trip "${ctx.trip.name}": stops: ${stops || 'none yet'}. Booked legs: ${legs || 'none yet'}.`);
  }

  if (ctx.travelers.length > 0) {
    const t = ctx.travelers
      .map((tr) => `${tr.name}${tr.passes[0] ? ` (${tr.passes[0].type}, ${tr.passes[0].validity})` : ''}`)
      .join(', ');
    parts.push(`Travelers: ${t}.`);
  }

  parts.push(
    'Never invent pass numbers, booking references or realtime data. The app shows realtime ' +
      'departures separately; you may tell the user to check the Departures tab for live data.',
  );

  return parts.join('\n\n');
}
