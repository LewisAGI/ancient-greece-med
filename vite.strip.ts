import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { publishContent } from './src/data/publish';

/** Kept beside the Vite config so the client bundle does not embed these strings. */
export const EXCLUDED_PHRASES = ['Pharos lighthouse', 'Palaiapolis', 'Protis and Gyptis'] as const;

export const EXCLUDED_IDS = ['s33', 's37', 's38', 'tl7', 'tl8', 'tl16'] as const;

export const ORPHAN_SOURCE_IDS = ['egy-alex', 'ucl-alex', 'mac-empuries', 'mhm-massalia'] as const;

/** Place names that belong to the excluded sites. The sources notice may still say three of them. */
export const EXCLUDED_PLACE_NAMES = ['Alexandria', 'Massalia', 'Emporion', 'Empúries', 'Marseille'] as const;

export function isPackFile(id: string, name: 'content.json' | 'sources.json'): boolean {
  const file = (id.split('?')[0] ?? id).replace(/\\/g, '/');
  return file === `data/${name}` || file.endsWith(`/data/${name}`);
}

export function assertPublished(value: unknown): unknown {
  const published = publishContent(value);
  const serialized = JSON.stringify(published);
  EXCLUDED_PHRASES.forEach((phrase) => {
    if (serialized.includes(phrase)) {
      throw new Error('published content still contains excluded text');
    }
  });
  EXCLUDED_IDS.forEach((entryId) => {
    if (serialized.includes(`"${entryId}"`)) {
      throw new Error('published content still contains an excluded id');
    }
  });
  return published;
}

export function citedSourceIds(content: unknown): Set<string> {
  const published = publishContent(content) as Record<string, unknown>;
  const ids = new Set<string>();
  Object.values(published).forEach((section) => {
    if (!Array.isArray(section)) return;
    section.forEach((entry) => {
      if (typeof entry !== 'object' || entry === null) return;
      const sources = (entry as { sources?: unknown }).sources;
      if (!Array.isArray(sources)) return;
      sources.forEach((id) => {
        if (typeof id === 'string') ids.add(id);
      });
    });
  });
  return ids;
}

/** Drop source records that no published entry cites. */
export function publishSources(sources: unknown, cited: Set<string>): unknown {
  if (!Array.isArray(sources)) throw new Error('sources must be an array');
  return sources.filter((source) => {
    if (typeof source !== 'object' || source === null) return false;
    const id = (source as { id?: unknown }).id;
    return typeof id === 'string' && cited.has(id);
  });
}

function publishedSourceModule(code: string): string {
  const contentPath = path.join(process.cwd(), 'data', 'content.json');
  const cited = citedSourceIds(JSON.parse(readFileSync(contentPath, 'utf8')) as unknown);
  const published = publishSources(JSON.parse(code) as unknown, cited);
  const serialized = JSON.stringify(published);
  ORPHAN_SOURCE_IDS.forEach((id) => {
    if (serialized.includes(`"${id}"`)) throw new Error('published sources still contain an orphan id');
  });
  return serialized;
}

/** Rewrite pack JSON before Vite turns it into a module. */
export function stripExcludedContent(): Plugin {
  return {
    name: 'strip-excluded-content',
    enforce: 'pre',
    transform(code, id) {
      if (isPackFile(id, 'content.json')) {
        const published = assertPublished(JSON.parse(code) as unknown);
        return { code: JSON.stringify(published), map: null };
      }
      if (isPackFile(id, 'sources.json')) {
        return { code: publishedSourceModule(code), map: null };
      }
      return null;
    },
  };
}
