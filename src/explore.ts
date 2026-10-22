import type { Entry } from './data/schema';
import { isMapped } from './data/schema';
import { mentionsPlace, placeKeys, type Pin } from './pins';
import { entryTitle } from './titles';

export const KNOWLEDGE_SECTIONS = ['periods', 'myths_places', 'sites'] as const;

export type PlaceFilter = 'all' | 'myth' | 'reading' | 'west' | 'east' | 'south';

const BROAD_SOURCES = new Set(['met-chron', 'met-class', 'met-hell', 'pyrgos']);

export function sectionEntries(sections: Record<string, Entry[]>, key: string): Entry[] {
  return sections[key] ?? [];
}

export function searchEntries(sections: Record<string, Entry[]>, query: string, limit = 24): Entry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return Object.values(sections)
    .flat()
    .filter((entry) => haystack(entry).includes(needle))
    .slice(0, limit);
}

export function glossaryEntries(sections: Record<string, Entry[]>): Entry[] {
  return Object.values(sections)
    .flat()
    .slice()
    .sort((a, b) => entryTitle(a).localeCompare(entryTitle(b)) || a.id.localeCompare(b.id));
}

export function relatedEntries(
  entry: Entry,
  sections: Record<string, Entry[]>,
  skip: ReadonlySet<string> = new Set(),
): Entry[] {
  const keys = new Set<string>([...placeKeys(entry.place ?? ''), ...placeKeys(entryTitle(entry))]);
  const ranked = Object.values(sections)
    .flat()
    .filter((other) => other.id !== entry.id && !skip.has(other.id))
    .map((other) => ({ other, score: relateScore(entry, other, keys) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.other.id.localeCompare(b.other.id));
  return ranked.slice(0, 5).map((item) => item.other);
}

export function pinMatches(pin: Pin, filter: PlaceFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'myth') return pin.myths.length > 0;
  if (filter === 'reading') {
    return (
      Boolean(pin.entry.primary_text || pin.entry.citation) ||
      pin.myths.some((myth) => Boolean(myth.primary_text || myth.citation))
    );
  }
  if (filter === 'west') return pin.lng < 15;
  if (filter === 'east') return pin.lng > 28;
  return pin.lat < 34;
}

export function overlapYears(a: Entry, b: Entry): { start: number; end: number } | null {
  if (a.start == null || a.end == null || b.start == null || b.end == null) return null;
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  if (start > end) return null;
  if (start === 0 || end === 0) return null;
  return { start, end };
}

function relateScore(entry: Entry, other: Entry, keys: Set<string>): number {
  let score = 0;
  const otherKeys = new Set<string>([...placeKeys(other.place ?? ''), ...placeKeys(entryTitle(other))]);
  keys.forEach((key) => {
    if (key.length < 4) return;
    const named = [...otherKeys].some((otherKey) => otherKey.toLowerCase() === key.toLowerCase());
    if (named) score += 6;
    if (mentionsPlace(other.text, key) || mentionsPlace(entryTitle(other), key)) score += 3;
  });
  const otherTitle = entryTitle(other);
  if (otherTitle.length >= 4 && mentionsPlace(entry.text, otherTitle)) score += 4;
  if (other.sources.some((id) => entry.sources.includes(id) && !BROAD_SOURCES.has(id))) score += 1;
  if (score > 0 && isMapped(other)) score += 10;
  return score;
}

function haystack(entry: Entry): string {
  return [entryTitle(entry), entry.text, entry.place ?? '', entry.citation ?? '', entry.primary_text ?? '']
    .join('\n')
    .toLowerCase();
}
