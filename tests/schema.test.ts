import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { publishContent } from '../src/data/publish';
import { labelBadges, bindSources, mappedEntries, parseContent, type Entry } from '../src/data/schema';
import { assertPublished, isPackFile, stripExcludedContent } from '../vite.strip';

const catalog = loadCatalog();
const entries = Object.values(catalog.content.sections).flat();

describe('v3 content pack', () => {
  it('loads the published catalog and resolves every citation', () => {
    expect(entries).toHaveLength(119);
    expect(catalog.content.sections.periods).toHaveLength(6);
    expect(catalog.content.sections.myths_places).toHaveLength(41);
    expect(catalog.content.sections.sites).toHaveLength(37);
    expect(catalog.content.sections.people).toHaveLength(12);
    expect(catalog.content.sections.timeline).toHaveLength(17);
    expect(catalog.content.sections.further_reading).toHaveLength(6);
    expect(catalog.sources).toHaveLength(49);
    ['egy-alex', 'ucl-alex', 'mac-empuries', 'mhm-massalia'].forEach((id) => {
      expect(catalog.sources.some((source) => source.id === id)).toBe(false);
    });
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
      's31',
      's36',
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

  it('keeps search-summary entries in the source file and out of the catalog', () => {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'content.json'), 'utf8')) as {
      sites: Entry[];
      timeline: Entry[];
    };
    const flagged = [...raw.sites, ...raw.timeline].filter((entry) => entry.include === false).map((entry) => entry.id);
    expect(flagged.sort()).toEqual(['s33', 's37', 's38', 'tl16', 'tl7', 'tl8']);
    const source = readFileSync(path.join(process.cwd(), 'data', 'content.json'), 'utf8');
    expect(source).toContain('Pharos lighthouse');
    expect(source).toContain('Palaiapolis');
    expect(source).toContain('Protis and Gyptis');
    const published = assertPublished(JSON.parse(source) as unknown);
    const publishedText = JSON.stringify(published);
    expect(publishedText).not.toContain('Pharos lighthouse');
    expect(publishedText).not.toContain('Palaiapolis');
    expect(publishedText).not.toContain('Protis and Gyptis');
    expect(publishedText).not.toContain('"s33"');
    expect(entries.map((entry) => entry.id)).not.toContain('s33');
    expect(entries.map((entry) => entry.id)).not.toContain('tl7');
    expect(publishContent(JSON.parse(source) as unknown)).toEqual(published);
    expect(JSON.stringify(catalog.content)).toContain('Abu Mena');
    expect(JSON.stringify(catalog.content)).toContain('Lugo');
    expect(JSON.stringify(catalog.content)).toContain('Naples');
  });

  it('turns qualified labels into short badges', () => {
    expect(labelBadges('evidence')).toEqual(['evidence']);
    expect(labelBadges('evidence (book) + inference (card adjacency)')).toEqual(['evidence', 'inference']);
    expect(labelBadges('evidence (book-level only)')).toEqual(['evidence']);
    expect(labelBadges('evidence (search-summary level)')).toEqual(['evidence', 'abstract-only']);
    const mycenae = entries.find((entry) => entry.id === 'm10');
    expect(labelBadges(mycenae?.label ?? '')).toEqual(['evidence', 'inference']);
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

describe('strip plugin paths', () => {
  it('rewrites content and sources JSON and ignores every other module', () => {
    expect(isPackFile('/workspace/data/content.json?import', 'content.json')).toBe(true);
    expect(isPackFile('data/sources.json', 'sources.json')).toBe(true);
    expect(isPackFile('/workspace/data/content.json.bak', 'content.json')).toBe(false);
    expect(isPackFile('/workspace/src/data/load.ts', 'content.json')).toBe(false);
    const plugin = stripExcludedContent();
    if (typeof plugin.transform !== 'function') throw new Error('transform hook missing');
    const transform = plugin.transform;
    const call = (code: string, id: string) => transform.call({} as never, code, id);
    expect(call('export const value = 1;', '/workspace/src/main.ts')).toBeNull();
    expect(call('{}', '/workspace/data/README.md')).toBeNull();
    const content = readFileSync('data/content.json', 'utf8');
    const published = call(content, '/workspace/data/content.json?used');
    expect(published).toMatchObject({ map: null });
    expect(JSON.stringify(published)).not.toContain('Pharos lighthouse');
    expect(JSON.stringify(published)).not.toContain('"s33"');
    const sources = readFileSync('data/sources.json', 'utf8');
    const stripped = call(sources, '/workspace/data/sources.json');
    const serialized = JSON.stringify(stripped);
    expect(serialized).not.toContain('egy-alex');
    expect(serialized).not.toContain('ucl-alex');
    expect(serialized).not.toContain('mac-empuries');
    expect(serialized).not.toContain('mhm-massalia');
    expect(serialized).not.toContain('Empúries');
    expect(serialized).not.toContain('Marseille');
    expect(serialized).toContain('unesco-delphi');
  });
});
