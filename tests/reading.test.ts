import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { GODS } from '../src/gods';
import { entryById } from '../src/data/load';
import { entryCredits, readingEntries, translatorCredit } from '../src/reading';
import { formatYear } from '../src/years';
import { LABEL_MIN_ZOOM, visibleLabelIds, type LabelBox } from '../src/labels';

describe('formatYear', () => {
  it('prints BCE and CE and has no year 0', () => {
    expect(formatYear(-480)).toBe('480 BCE');
    expect(formatYear(330)).toBe('330 CE');
    expect(formatYear(0)).toBe('');
  });
});

describe('gods', () => {
  const catalog = loadCatalog();

  it('points each god at an entry that names them', () => {
    GODS.forEach((god) => {
      expect(god.links.length).toBeGreaterThan(0);
      god.links.forEach((link) => {
        const entry = entryById(catalog.content, link.entryId);
        expect(entry?.text.toLowerCase()).toContain(god.name.toLowerCase());
      });
    });
  });
});

describe('readings', () => {
  const catalog = loadCatalog();

  it('credits the Gutenberg translators on primary-text entries', () => {
    const hesiod = catalog.sources.find((source) => source.id === 'pg-hesiod');
    const jones = catalog.sources.find((source) => source.id === 'theoi-paus2');
    expect(translatorCredit(hesiod!)).toBe('H.G. Evelyn-White · Project Gutenberg');
    expect(translatorCredit(jones!)).toBe('W.H.S. Jones');
    const hymn = catalog.content.sections.myths_places.find((entry) => entry.id === 'm8');
    expect(entryCredits(hymn!, catalog.sources)).toContain('H.G. Evelyn-White · Project Gutenberg');
    const readings = readingEntries(catalog.content.sections);
    expect(readings.some((entry) => entry.id === 'm10')).toBe(true);
    expect(readings.some((entry) => entry.id === 'm15')).toBe(true);
    expect(readings.some((entry) => entry.id === 'm1')).toBe(false);
  });
});

function box(id: string, left: number, top: number, size = 40): LabelBox {
  return { id, left, top, right: left + size, bottom: top + 16 };
}

describe('visibleLabelIds', () => {
  it('hides a label that overlaps an earlier one', () => {
    const visible = visibleLabelIds([box('a', 0, 0), box('b', 10, 0), box('c', 200, 0)]);
    expect([...visible]).toEqual(['a', 'c']);
  });

  it('keeps the threshold above a whole-earth view', () => {
    expect(LABEL_MIN_ZOOM).toBeGreaterThan(3);
  });
});
