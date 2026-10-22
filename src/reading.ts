import type { Entry, SourceRecord } from './data/schema';

const GUTENBERG = /project gutenberg/i;

/** Translator credit for a public-domain primary text. Gutenberg editions name the project. */
export function translatorCredit(source: SourceRecord): string | null {
  const translator = source.title.match(/tr\.\s*([^,)]+)/)?.[1]?.trim();
  if (!translator) return null;
  if (GUTENBERG.test(source.author_org) || source.id.startsWith('pg-')) {
    return `${translator} · Project Gutenberg`;
  }
  return translator;
}

export function entryCredits(entry: Entry, sources: SourceRecord[]): string[] {
  const credits: string[] = [];
  entry.sources.forEach((id) => {
    const source = sources.find((item) => item.id === id);
    if (!source) return;
    const credit = translatorCredit(source);
    if (credit && !credits.includes(credit)) credits.push(credit);
  });
  return credits;
}

/** Entries that cite a primary-text translation and can open a reading panel. */
export function readingEntries(sections: Record<string, Entry[]>): Entry[] {
  return Object.values(sections)
    .flat()
    .filter(
      (entry) =>
        Boolean(entry.primary_text) ||
        entry.sources.some((id) => id.startsWith('pg-') || id.startsWith('theoi-')),
    );
}
