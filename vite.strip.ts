import type { Plugin } from 'vite';
import { publishContent } from './src/data/publish';

/** Kept beside the Vite config so the client bundle does not embed these strings. */
export const EXCLUDED_PHRASES = ['Pharos lighthouse', 'Palaiapolis', 'Protis and Gyptis'] as const;

export function assertPublished(value: unknown): unknown {
  const published = publishContent(value);
  const serialized = JSON.stringify(published);
  EXCLUDED_PHRASES.forEach((phrase) => {
    if (serialized.includes(phrase)) {
      throw new Error('published content still contains excluded text');
    }
  });
  return published;
}

/** Rewrite content JSON before Vite turns it into a module. */
export function stripExcludedContent(): Plugin {
  return {
    name: 'strip-excluded-content',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0] ?? id;
      if (!file.endsWith('/data/content.json')) return null;
      const published = assertPublished(JSON.parse(code) as unknown);
      return { code: JSON.stringify(published), map: null };
    },
  };
}
