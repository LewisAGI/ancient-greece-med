import contentJson from '../../data/content.json';
import sourcesJson from '../../data/sources.json';
import { bindSources, parseContent, parseSources, type ContentPack, type Entry, type SourceRecord } from './schema';

export interface Catalog {
  content: ContentPack;
  sources: SourceRecord[];
}

export function loadCatalog(): Catalog {
  const content = parseContent(contentJson);
  const sources = parseSources(sourcesJson);
  bindSources(content, sources);
  return { content, sources };
}

export function sourceById(sources: SourceRecord[], id: string): SourceRecord | undefined {
  return sources.find((source) => source.id === id);
}

export function entryById(content: ContentPack, id: string): Entry | undefined {
  return Object.values(content.sections)
    .flat()
    .find((entry) => entry.id === id);
}
