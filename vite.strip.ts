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

const excludedEntryIds = new Set<string>(EXCLUDED_IDS);

/** Pack files have no `include: false`. Drop the held-back ids here, in the build plugin. */
export function withoutHeldBack(value: unknown): unknown {
  const published = publishContent(value);
  if (typeof published !== 'object' || published === null || Array.isArray(published)) return published;
  const output: Record<string, unknown> = {};
  Object.entries(published as Record<string, unknown>).forEach(([key, section]) => {
    if (!Array.isArray(section)) {
      output[key] = section;
      return;
    }
    output[key] = section.filter((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const id = (entry as { id?: unknown }).id;
      return typeof id !== 'string' || !excludedEntryIds.has(id);
    });
  });
  return output;
}

export function assertPublished(value: unknown): unknown {
  const published = withoutHeldBack(value);
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
  const published = withoutHeldBack(content) as Record<string, unknown>;
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

/** Drop a trailing excluded place name so a cited reference can stay in the bundle. */
export function publishedSourceTitle(title: string): string {
  let next = title;
  EXCLUDED_PLACE_NAMES.forEach((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\s*[:\\-–—]\\s*${escaped}\\b`, 'gu'), '');
  });
  return next.replace(/[ \t]{2,}/g, ' ').trim();
}

/** Drop source records that no published entry cites. */
export function publishSources(sources: unknown, cited: Set<string>): unknown {
  if (!Array.isArray(sources)) throw new Error('sources must be an array');
  return sources.flatMap((source) => {
    if (typeof source !== 'object' || source === null) return [];
    const record = source as { id?: unknown; title?: unknown };
    if (typeof record.id !== 'string' || !cited.has(record.id)) return [];
    if (typeof record.title !== 'string') return [source];
    return [{ ...record, title: publishedSourceTitle(record.title) }];
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
