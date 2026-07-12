/**
 * Curated Interrail knowledge base.
 *
 * This is the seed of the app's "community knowledge" layer. The long-term
 * design (see README roadmap) is a server-side pipeline that ingests public
 * knowledge sources — rail operator FAQs, The Man in Seat 61, community
 * forums, and Q&A distilled from groups like Tågsemester (with permission,
 * via its admins; Facebook groups cannot legally be scraped) — into a
 * searchable index the assistant can cite. Until that pipeline exists, the
 * assistant grounds its answers in this curated, locally bundled corpus plus
 * live data from the transport API.
 */

export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];
  content: string;
  source: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'pass-basics',
    topic: 'Interrail pass basics',
    keywords: ['pass', 'interrail', 'eurail', 'global pass', 'travel day', 'validity'],
    content:
      'An Interrail Global Pass covers 33 European countries. Flexi passes (e.g. 7 days within 1 month) ' +
      'give a number of travel days; on a travel day you can take unlimited included trains from 00:00 to ' +
      '23:59. Continuous passes cover every day in the validity window. Interrail is for European residents; ' +
      'Eurail is the equivalent for everyone else. You get one outbound and one inbound journey in your own ' +
      'country of residence.',
    source: 'interrail.eu pass conditions',
  },
  {
    id: 'night-train-rule',
    topic: 'Night trains and travel days',
    keywords: ['night train', 'sleeper', 'travel day', 'midnight'],
    content:
      'For direct night trains you only need a travel day for the departure date, as long as the pass is ' +
      'valid on the arrival day too. Board before midnight and you do not spend a second travel day, even ' +
      'if you arrive the next morning. Seat/berth reservations on night trains are separate and often ' +
      'sell out weeks ahead in summer — book couchettes early (e.g. Nightjet, European Sleeper, SJ EuroNight).',
    source: 'interrail.eu night train rule',
  },
  {
    id: 'reservations',
    topic: 'Seat reservations',
    keywords: ['reservation', 'seat', 'tgv', 'ave', 'eurostar', 'italy', 'france', 'spain', 'supplement'],
    content:
      'Reservations are mandatory on most high-speed trains in France (TGV, ~€10–20 passholder fee, limited ' +
      'quota), Spain (AVE), Italy (Frecce, €13), Sweden (SJ high speed, ~30 SEK+) and on Eurostar. Germany, ' +
      'Austria, Switzerland, the Netherlands and most regional trains need no reservation — you just board. ' +
      'Passholder reservations often cannot be bought in one place: use operator sites/apps, the Interrail ' +
      'reservation service, or station counters.',
    source: 'interrail.eu reservation guide, seat61.com',
  },
  {
    id: 'sweden-booking',
    topic: 'Booking passholder reservations in Sweden',
    keywords: ['sj', 'sweden', 'sverige', 'snälltåget', 'öresund', 'reservation'],
    content:
      'SJ sells passholder seat reservations on sj.se and in the SJ app (choose "Interrail/Eurail" as ticket ' +
      'type where offered) or by phone. Snälltåget (Stockholm–Malmö–Berlin night train in summer) sells ' +
      'passholder reservations on snalltaget.se. Öresundståg over the bridge to Copenhagen needs no ' +
      'reservation. X2000 requires a seat reservation.',
    source: 'community knowledge (Tågsemester-style FAQs), sj.se',
  },
  {
    id: 'mobile-pass',
    topic: 'Mobile pass practicalities',
    keywords: ['mobile pass', 'rail planner', 'app', 'activate', 'add journey', 'ticket control'],
    content:
      'A mobile pass lives in the Rail Planner app: activate the pass, add each journey to "My Trip" before ' +
      'boarding, and show the generated ticket QR at control. The app works offline, but needs to go online ' +
      'at least once every 3 days. Keep your pass number and the passport used at purchase with you — ' +
      'inspectors may ask for ID matching the pass.',
    source: 'interrail.eu / Rail Planner FAQ',
  },
  {
    id: 'benelux-germany',
    topic: 'Germany & Benelux tips',
    keywords: ['germany', 'db', 'ice', 'netherlands', 'belgium', 'delay', 'strike'],
    content:
      'In Germany ICE/IC trains need no reservation with a pass (optional seat reservation ~€5.5 recommended ' +
      'in summer). German long-distance trains are frequently delayed — keep 20–30 min buffers on transfers ' +
      'and check realtime data on the day. If a delay makes you miss the last connection, DB has to get you ' +
      'to your destination; ask staff or use the DB Navigator alternatives view.',
    source: 'seat61.com, community experience',
  },
  {
    id: 'budget',
    topic: 'Typical budget',
    keywords: ['budget', 'cost', 'money', 'cheap', 'hostel', 'food'],
    content:
      'A common backpacker budget is €70–120 per person per day: hostel dorm €25–45, food €20–35, ' +
      'reservations €0–20, activities and local transport the rest. Southern and eastern Europe are ' +
      'substantially cheaper than Scandinavia and Switzerland. Night trains save a hostel night but cost a ' +
      'couchette reservation (€30–60).',
    source: 'community estimates',
  },
  {
    id: 'luggage-safety',
    topic: 'Luggage & safety on trains',
    keywords: ['luggage', 'backpack', 'theft', 'safety', 'lock'],
    content:
      'There is no check-in luggage on European trains — you keep your backpack with you on racks. Use the ' +
      'rack in sight of your seat where possible, lock zippers in night trains, and keep passes/passports on ' +
      'your body. Most night trains have lockable compartments in couchette/sleeper class.',
    source: 'community experience',
  },
];

/** Naive keyword retrieval over the local knowledge base. */
export function retrieve(query: string, max = 3): KnowledgeEntry[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
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
