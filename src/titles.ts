import type { Entry } from './data/schema';
import { withEra } from './era';

/** Short heading taken from the entry. Place names win; otherwise the opening clause. */
export function entryTitle(entry: Entry): string {
  if (entry.place?.trim()) {
    const first = entry.place.split(';')[0]?.trim() ?? entry.place.trim();
    const bare = first.split(/[,(/]/)[0]?.trim() ?? first;
    if (bare.length >= 3 && bare.length <= 32) return bare;
    return first;
  }
  const cut = entry.text.split(/[;(]/)[0]?.trim() ?? entry.text;
  const comma = cut.split(',')[0]?.trim() ?? cut;
  const colon = comma.split(':')[0]?.trim() ?? comma;
  const chosen = colon.length >= 3 && colon.length <= 42 ? colon : comma.length <= 48 ? comma : cut;
  const head = chosen.replace(/\.$/, '');
  const title = head.length <= 48 ? head : `${head.slice(0, 45).trimEnd()}…`;
  return withEra(title);
}

export function sectionHeading(key: string): string {
  if (key === 'myths_places') return 'Myths';
  if (key === 'periods') return 'Periods';
  if (key === 'sites') return 'Sites';
  if (key === 'people') return 'People';
  if (key === 'timeline') return 'Timeline';
  if (key === 'further_reading') return 'Further reading';
  return key.replace(/_/g, ' ');
}
