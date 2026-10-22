import type { Entry } from './data/schema';
import { isMapped } from './data/schema';
import { entryTitle } from './titles';

export interface Pin {
  id: string;
  title: string;
  lat: number;
  lng: number;
  entry: Entry;
  myths: Entry[];
}

/** Whole-word place match, so Delos does not claim Delphi. */
export function mentionsPlace(text: string, place: string): boolean {
  const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/** "Delphi (Pytho)", "Cythera; Cyprus", and "Olympia area" become the names worth matching. */
export function placeKeys(place: string): string[] {
  const keys = new Set<string>();
  place.split(';').forEach((segment) => {
    const part = segment.trim();
    if (!part) return;
    const head = part.split('/')[0]?.trim() ?? part;
    const bare = head.split(/[,(]/)[0]?.trim() ?? head;
    addPlaceKey(keys, bare);
    const area = bare.match(/^(.+?)\s+area$/i);
    if (area?.[1]) addPlaceKey(keys, area[1]);
  });
  return [...keys];
}

function addPlaceKey(keys: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (trimmed.length >= 4) keys.add(trimmed);
}

export function buildPins(sections: Record<string, Entry[]>): Pin[] {
  const mapped = Object.values(sections).flat().filter(isMapped);
  const floatingMyths = (sections.myths_places ?? []).filter((entry) => !isMapped(entry) && entry.place);
  const mythsBySite = new Map<string, Entry[]>();
  floatingMyths.forEach((myth) => {
    const site = siteForMyth(myth, mapped);
    if (!site) return;
    const list = mythsBySite.get(site.id) ?? [];
    list.push(myth);
    mythsBySite.set(site.id, list);
  });
  return mapped.map((entry) => ({
    id: entry.id,
    title: entryTitle(entry),
    lat: entry.coords.lat,
    lng: entry.coords.lon,
    entry,
    myths: mythsBySite.get(entry.id) ?? [],
  }));
}

function siteForMyth(myth: Entry, mapped: Array<Entry & { coords: { lat: number; lon: number } }>): Entry | undefined {
  const keys = placeKeys(myth.place ?? '');
  const hits = mapped.filter((site) =>
    keys.some((key) => mentionsPlace(site.text, key) || mentionsPlace(entryTitle(site), key)),
  );
  if (hits.length === 0) return undefined;
  return (
    hits.find((site) => keys.some((key) => entryTitle(site).toLowerCase() === key.toLowerCase())) ?? hits[0]
  );
}

export function pinForEntry(pins: Pin[], entryId: string): Pin | undefined {
  return pins.find((pin) => pin.id === entryId || pin.myths.some((myth) => myth.id === entryId));
}

export function bboxOf(
  points: { lat: number; lng: number }[],
  pad = 0.55,
): [number, number, number, number] {
  const west = Math.min(...points.map((point) => point.lng)) - pad;
  const east = Math.max(...points.map((point) => point.lng)) + pad;
  const south = Math.min(...points.map((point) => point.lat)) - pad;
  const north = Math.max(...points.map((point) => point.lat)) + pad;
  return [west, south, east, north];
}

/** Framing box for every sourced pin, Greece and the wider Mediterranean. */
export function overviewBBox(pins: Pin[]): [number, number, number, number] {
  if (pins.length === 0) return [12, 31, 37, 42];
  return bboxOf(pins, 1.6);
}
