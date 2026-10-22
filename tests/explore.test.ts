import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { KNOWLEDGE_SECTIONS, glossaryEntries, overlapYears, pinMatches, relatedEntries, searchEntries } from '../src/explore';
import { buildPins } from '../src/pins';
import { yearInside } from '../src/years';

const { content } = loadCatalog();
const sections = content.sections;
const pins = buildPins(sections);

describe('explore', () => {
  it('searches published entries and hides the excluded names', () => {
    expect(searchEntries(sections, 'Abu Mena').some((entry) => entry.id === 's31')).toBe(true);
    expect(searchEntries(sections, 'Lugo').some((entry) => entry.id === 's36')).toBe(true);
    expect(searchEntries(sections, 'Pharos')).toEqual([]);
    expect(searchEntries(sections, 'Palaiapolis')).toEqual([]);
    expect(searchEntries(sections, 'a')).toEqual([]);
  });

  it('links a Pausanias story to its mapped place', () => {
    const castalia = sections.myths_places?.find((entry) => entry.id === 'm27');
    const olympia = sections.myths_places?.find((entry) => entry.id === 'm35');
    expect(relatedEntries(castalia!, sections).some((entry) => entry.id === 's2')).toBe(true);
    expect(relatedEntries(olympia!, sections).some((entry) => entry.id === 's3')).toBe(true);
  });

  it('keeps people and the timeline out of the knowledge sections', () => {
    expect(KNOWLEDGE_SECTIONS).toEqual(['periods', 'myths_places', 'sites']);
    expect(glossaryEntries(sections).some((entry) => entry.id === 'pe1')).toBe(true);
    expect(glossaryEntries(sections).some((entry) => entry.id === 'fr5')).toBe(true);
  });

  it('filters pins by myth, reading, and sea without dropping Abu Mena or Lugo from the full set', () => {
    expect(pins.filter((pin) => pinMatches(pin, 'all'))).toHaveLength(17);
    expect(pins.filter((pin) => pinMatches(pin, 'west')).map((pin) => pin.id)).toContain('s36');
    expect(pins.filter((pin) => pinMatches(pin, 'west')).map((pin) => pin.id)).not.toContain('s1');
    expect(pins.filter((pin) => pinMatches(pin, 'east')).map((pin) => pin.id)).toContain('s31');
    expect(pins.filter((pin) => pinMatches(pin, 'south')).map((pin) => pin.id)).toContain('s31');
    expect(pins.filter((pin) => pinMatches(pin, 'myth')).length).toBeGreaterThan(3);
  });

  it('overlaps dated periods and refuses a timeline year outside the slider', () => {
    const archaic = sections.periods?.find((entry) => entry.id === 'per2');
    const classical = sections.periods?.find((entry) => entry.id === 'per3');
    expect(overlapYears(archaic!, classical!)).toEqual({ start: -480, end: -480 });
    const bounds = { first: -900, last: 330 };
    expect(yearInside(-510, bounds)).toBe(true);
    expect(yearInside(-2800, bounds)).toBe(false);
    expect(yearInside(0, bounds)).toBe(false);
  });
});
