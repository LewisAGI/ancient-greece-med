export const LABELS = ['evidence', 'inference', 'abstract-only'] as const;
export type EntryLabel = (typeof LABELS)[number];

export interface Coords {
  lat: number;
  lon: number;
  source_format?: string;
}

export interface Entry {
  id: string;
  text: string;
  sources: string[];
  label: EntryLabel;
  coords?: Coords | null;
  uncertainty?: string;
  sensitivity?: string;
  debate?: string;
  start?: number;
  end?: number;
  place?: string;
  /** Work and section for a public-domain primary text. */
  primary_text?: string;
  country_region?: string | null;
  unesco_year?: number | null;
}

export interface ContentMeta {
  pack: string;
  version: number;
  created: string;
  note?: string;
}

export interface ContentPack {
  meta: ContentMeta;
  sections: Record<string, Entry[]>;
}

export interface SourceRecord {
  id: string;
  title: string;
  author_org: string;
  url: string;
  date_accessed: string;
  quality: string;
}

const ENTRY_KEYS = new Set([
  'id',
  'text',
  'sources',
  'label',
  'coords',
  'uncertainty',
  'sensitivity',
  'debate',
  'start',
  'end',
  'place',
  'primary_text',
  'country_region',
  'unesco_year',
]);

export function parseContent(value: unknown): ContentPack {
  const errors = contentErrors(value);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  const record = value as Record<string, unknown>;
  const sections: Record<string, Entry[]> = {};
  Object.keys(record).forEach((key) => {
    if (key === 'meta') return;
    sections[key] = record[key] as Entry[];
  });
  return { meta: record.meta as ContentMeta, sections };
}

export function parseSources(value: unknown): SourceRecord[] {
  const errors = sourceErrors(value);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return value as SourceRecord[];
}

export function bindSources(pack: ContentPack, sources: SourceRecord[]): void {
  const ids = new Set(sources.map((source) => source.id));
  const errors: string[] = [];
  Object.values(pack.sections).forEach((entries) => {
    entries.forEach((entry) => {
      entry.sources.forEach((id) => {
        if (!ids.has(id)) errors.push(`${entry.id} cites missing source "${id}"`);
      });
    });
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

/** A pin exists only when the entry itself carries a sourced coordinate. */
export function isMapped(entry: Entry): entry is Entry & { coords: Coords } {
  const coords = entry.coords;
  if (!coords) return false;
  return Number.isFinite(coords.lat) && Number.isFinite(coords.lon);
}

export function mappedEntries(pack: ContentPack): Array<Entry & { coords: Coords }> {
  return Object.values(pack.sections).flat().filter(isMapped);
}

function contentErrors(value: unknown): string[] {
  const errors: string[] = [];
  const record = asRecord(value, 'content', errors);
  if (!record) return errors;
  const meta = asRecord(record.meta, 'meta', errors);
  if (meta) {
    needString(meta, 'pack', errors, 'meta');
    needString(meta, 'created', errors, 'meta');
    if (meta.note != null) needString(meta, 'note', errors, 'meta');
    if (typeof meta.version !== 'number' || !Number.isInteger(meta.version)) errors.push('meta.version must be an integer');
  }
  const ids = new Set<string>();
  Object.keys(record).forEach((key) => {
    if (key === 'meta') return;
    const entries = record[key];
    if (!Array.isArray(entries)) {
      errors.push(`${key} must be an array`);
      return;
    }
    entries.forEach((item, index) => entryErrors(item, `${key}[${index}]`, ids, errors));
  });
  return errors;
}

function sourceErrors(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) return ['sources must be an array'];
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const prefix = `sources[${index}]`;
    const record = asRecord(item, prefix, errors);
    if (!record) return;
    const id = needString(record, 'id', errors, prefix);
    if (id && ids.has(id)) errors.push(`${prefix}.id is duplicated`);
    if (id) ids.add(id);
    needString(record, 'title', errors, prefix);
    needString(record, 'author_org', errors, prefix);
    const url = needString(record, 'url', errors, prefix);
    if (url && !/^https?:\/\//.test(url)) errors.push(`${prefix}.url must be http(s)`);
    const accessed = needString(record, 'date_accessed', errors, prefix);
    if (accessed && !/^\d{4}-\d{2}-\d{2}$/.test(accessed)) errors.push(`${prefix}.date_accessed must be YYYY-MM-DD`);
    needString(record, 'quality', errors, prefix);
    unknownKeys(record, new Set(['id', 'title', 'author_org', 'url', 'date_accessed', 'quality']), prefix, errors);
  });
  return errors;
}

function entryErrors(value: unknown, prefix: string, ids: Set<string>, errors: string[]): void {
  const record = asRecord(value, prefix, errors);
  if (!record) return;
  unknownKeys(record, ENTRY_KEYS, prefix, errors);
  const id = needString(record, 'id', errors, prefix);
  if (id && ids.has(id)) errors.push(`${prefix}.id is duplicated`);
  if (id) ids.add(id);
  needString(record, 'text', errors, prefix);
  const label = needString(record, 'label', errors, prefix);
  if (label && !LABELS.includes(label as EntryLabel)) {
    errors.push(`${prefix}.label must be one of ${LABELS.join(', ')}`);
  }
  const sources = record.sources;
  if (!Array.isArray(sources) || sources.some((item) => typeof item !== 'string' || item.trim() === '')) {
    errors.push(`${prefix}.sources must be an array of ids`);
  } else if (sources.length === 0) {
    errors.push(`${prefix}.sources must name at least one source`);
  }
  if ('coords' in record) coordErrors(record.coords, prefix, errors);
  optionalString(record, 'uncertainty', prefix, errors);
  optionalString(record, 'sensitivity', prefix, errors);
  optionalString(record, 'debate', prefix, errors);
  optionalString(record, 'place', prefix, errors);
  optionalString(record, 'primary_text', prefix, errors);
  optionalString(record, 'country_region', prefix, errors);
  if ('unesco_year' in record && record.unesco_year != null) {
    const year = record.unesco_year;
    if (typeof year !== 'number' || !Number.isInteger(year)) errors.push(`${prefix}.unesco_year must be an integer`);
  }
  const start = optionalYear(record, 'start', prefix, errors);
  const end = optionalYear(record, 'end', prefix, errors);
  if (start != null && end != null && start > end) errors.push(`${prefix}.start must be <= end`);
}

function coordErrors(value: unknown, prefix: string, errors: string[]): void {
  if (value == null) return;
  const record = asRecord(value, `${prefix}.coords`, errors);
  if (!record) return;
  const lat = needNumber(record, 'lat', errors, `${prefix}.coords`);
  const lon = needNumber(record, 'lon', errors, `${prefix}.coords`);
  if (lat != null && (lat < -90 || lat > 90)) errors.push(`${prefix}.coords.lat is outside -90..90`);
  if (lon != null && (lon < -180 || lon > 180)) errors.push(`${prefix}.coords.lon is outside -180..180`);
  if ('source_format' in record && record.source_format != null) {
    needString(record, 'source_format', errors, `${prefix}.coords`);
  }
  unknownKeys(record, new Set(['lat', 'lon', 'source_format']), `${prefix}.coords`, errors);
}

function optionalString(record: Record<string, unknown>, key: string, prefix: string, errors: string[]): void {
  if (!(key in record) || record[key] == null) return;
  needString(record, key, errors, prefix);
}

function optionalYear(record: Record<string, unknown>, key: string, prefix: string, errors: string[]): number | null {
  if (!(key in record) || record[key] == null) return null;
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value === 0) {
    errors.push(`${prefix}.${key} must be a historical year (no year 0)`);
    return null;
  }
  return value;
}

function unknownKeys(record: Record<string, unknown>, allowed: Set<string>, prefix: string, errors: string[]): void {
  Object.keys(record).forEach((key) => {
    if (!allowed.has(key)) errors.push(`${prefix} has unknown field "${key}"`);
  });
}

function asRecord(value: unknown, label: string, errors: string[]): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return null;
  }
  return value as Record<string, unknown>;
}

function needString(record: Record<string, unknown>, key: string, errors: string[], prefix: string): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${prefix}.${key} must be a non-empty string`);
    return null;
  }
  return value;
}

function needNumber(record: Record<string, unknown>, key: string, errors: string[], prefix: string): number | null {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${prefix}.${key} must be a finite number`);
    return null;
  }
  return value;
}
