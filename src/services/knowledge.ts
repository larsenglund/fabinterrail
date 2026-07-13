/**
 * Curated Interrail knowledge base — offline grounding for the assistant.
 *
 * The entries live in shared/knowledge.json, which is also bundled into the
 * assistant Worker (worker/) so both answer from the same corpus. The corpus
 * grows by pull request: distilled community wisdom (Tågsemester-style
 * FAQs — via permitted, admin-provided material, never scraping), operator
 * conditions, interrail.eu, The Man in Seat 61.
 */

import knowledgeData from '../../shared/knowledge.json';

export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];
  content: string;
  source: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = knowledgeData.entries;

/** Naive keyword retrieval over the local knowledge base. */
export function retrieve(query: string, max = 3): KnowledgeEntry[] {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    for (const w of words) {
      if (entry.keywords.some((k) => k.includes(w) || w.includes(k))) score += 3;
      if (entry.topic.toLowerCase().includes(w)) score += 2;
      if (entry.content.toLowerCase().includes(w)) score += 1;
    }
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.entry);
}
