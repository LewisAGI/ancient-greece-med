import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { bindSources, mappedEntries, parseContent, type Entry } from '../src/data/schema';

const catalog = loadCatalog();
const entries = Object.values(catalog.content.sections).flat();

describe('v2 content pack', () => {
  it('loads 56 entries and 36 sources, with every citation resolved', () => {
    expect(entries).toHaveLength(56);
    expect(catalog.content.sections.periods).toHaveLength(6);
    expect(catalog.content.sections.myths_places).toHaveLength(22);
    expect(catalog.content.sections.sites).toHaveLength(28);
    expect(catalog.sources).toHaveLength(36);
    const ids = new Set(catalog.sources.map((source) => source.id));
    entries.forEach((entry) => {
      expect(entry.sources.length).toBeGreaterThan(0);
      entry.sources.forEach((id) => expect(ids.has(id)).toBe(true));
    });
  });

  it('pins only entries that carry coordinates', () => {
    expect(mappedEntries(catalog.content).map((entry) => entry.id)).toEqual([
      's1',
      's2',
      's3',
      's4',
      's5',
      's8',
      's11',
      's15',
      's16',
      's17',
      's19',
      's22',
      's24',
      's26',
      's28',
    ]);
    for (const id of ['s6', 's7', 's9', 's10', 's12', 's13', 's14', 's18', 's20', 's21', 's23', 's25', 's27']) {
      const entry = entries.find((item) => item.id === id) as Entry;
      expect(entry.coords).toBeNull();
    }
  });

  it('keeps Gutenberg translator credits on the primary-text sources', () => {
    const hesiod = catalog.sources.find((source) => source.id === 'pg-hesiod');
    const iliad = catalog.sources.find((source) => source.id === 'pg-iliad');
    const odyssey = catalog.sources.find((source) => source.id === 'pg-odyssey');
    expect(hesiod?.title).toMatch(/Evelyn-White/);
    expect(hesiod?.author_org).toMatch(/Project Gutenberg/);
    expect(iliad?.title).toMatch(/Samuel Butler/);
    expect(iliad?.author_org).toMatch(/Project Gutenberg/);
    expect(odyssey?.author_org).toMatch(/Project Gutenberg/);
    expect(catalog.sources.find((source) => source.id === 'theoi-paus2')?.title).toMatch(/Jones/);
  });

  it('does not ship the example rows the pack now covers', () => {
    expect(existsSync(path.join(process.cwd(), 'data', 'examples.json'))).toBe(false);
    const blob = JSON.stringify(catalog.content);
    expect(blob).not.toMatch(/Example data/);
    expect(entries.some((entry) => entry.id.startsWith('ex-'))).toBe(false);
  });

  it('rejects a bad label, a missing source, and an unknown field', () => {
    const broken = structuredClone(catalog.content.sections.sites[0]) as Entry;
    broken.label = 'guess' as Entry['label'];
    expect(() => parseContent({ meta: catalog.content.meta, sites: [broken] })).toThrow(/label/);

    const unsourced = structuredClone(catalog.content.sections.sites[0]) as Entry;
    unsourced.sources = ['missing-source'];
    const pack = parseContent({ meta: catalog.content.meta, sites: [unsourced] });
    expect(() => bindSources(pack, catalog.sources)).toThrow(/missing source/);

    const extra = { ...catalog.content.sections.sites[0], invented: true };
    expect(() => parseContent({ meta: catalog.content.meta, sites: [extra] })).toThrow(/unknown field/);
  });
});
