import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { GODS } from '../src/gods';
import { entryById } from '../src/data/load';
import { entryCredits, readingEntries, translatorCredit } from '../src/reading';
import { formatYear } from '../src/years';
import { withEra } from '../src/era';
import { LABEL_MIN_ZOOM, MAX_PIN_OFFSET, markerOffsets, overlappingGroups, visibleLabelIds, type LabelBox } from '../src/labels';

describe('withEra', () => {
  it('writes BCE and CE without touching words that already use them', () => {
    expect(withEra('ca. 700-480 BC and 330 AD')).toBe('ca. 700-480 BCE and 330 CE');
    expect(withEra('480 BCE')).toBe('480 BCE');
    expect(withEra('B.C.')).toBe('BCE');
  });
});

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

describe('markerOffsets', () => {
  it('leaves pins alone when their hit targets already clear each other', () => {
    const offsets = markerOffsets([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 80, y: 0 },
    ]);
    expect(offsets.get('a')).toEqual({ dx: 0, dy: 0 });
    expect(offsets.get('b')).toEqual({ dx: 0, dy: 0 });
  });

  it('nudges a pin that covers an earlier center and stays inside the frame', () => {
    const points = [
      { id: 'north', x: 120, y: 40 },
      { id: 'south', x: 124, y: 48 },
    ];
    const bounds = { left: 0, top: 0, right: 240, bottom: 200 };
    const offsets = markerOffsets(points, { bounds });
    expect(offsets.get('north')).toEqual({ dx: 0, dy: 0 });
    const south = offsets.get('south');
    expect(south).toBeTruthy();
    const bx = 124 + (south?.dx ?? 0);
    const by = 48 + (south?.dy ?? 0);
    expect(Math.abs(bx - 120) >= 34 || Math.abs(by - 40) >= 34).toBe(true);
    expect(bx).toBeGreaterThanOrEqual(16);
    expect(by).toBeGreaterThanOrEqual(16);
    expect(bx).toBeLessThanOrEqual(224);
    expect(by).toBeLessThanOrEqual(184);
  });

  it('keeps every nudge inside twice the pin size', () => {
    const points = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, x: 400, y: 400 }));
    const offsets = markerOffsets(points, {
      maxOffset: MAX_PIN_OFFSET,
      bounds: { left: 0, top: 0, right: 800, bottom: 800 },
    });
    offsets.forEach((shift) => {
      expect(Math.hypot(shift.dx, shift.dy)).toBeLessThanOrEqual(MAX_PIN_OFFSET + 0.5);
    });
    expect(MAX_PIN_OFFSET).toBeLessThanOrEqual(64);
  });

  it('does not nudge at low zoom and groups the overlap', () => {
    const points = [
      { id: 'a', x: 40, y: 40 },
      { id: 'b', x: 44, y: 48 },
    ];
    const offsets = markerOffsets(points, { nudge: false });
    expect(offsets.get('a')).toEqual({ dx: 0, dy: 0 });
    expect(offsets.get('b')).toEqual({ dx: 0, dy: 0 });
    expect(overlappingGroups(points, offsets).map((group) => group.memberIds)).toEqual([['a', 'b']]);
  });

  it('separates a stack of pins that share one screen point', () => {
    const points = Array.from({ length: 8 }, (_, index) => ({
      id: `p${index}`,
      x: 160,
      y: 160,
    }));
    const offsets = markerOffsets(points, { bounds: { left: 0, top: 0, right: 360, bottom: 360 } });
    const spots = points.map((point) => {
      const shift = offsets.get(point.id) ?? { dx: 0, dy: 0 };
      return { x: point.x + shift.dx, y: point.y + shift.dy };
    });
    spots.forEach((spot, index) => {
      spots.slice(index + 1).forEach((other) => {
        expect(Math.abs(spot.x - other.x) >= 18 || Math.abs(spot.y - other.y) >= 18).toBe(true);
      });
    });
  });
});
