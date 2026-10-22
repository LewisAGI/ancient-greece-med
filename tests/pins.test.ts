import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/data/load';
import { buildPins } from '../src/pins';
import { entryTitle } from '../src/titles';

const { content } = loadCatalog();
const pins = buildPins(content.sections);

describe('pins', () => {
  it('draws sourced sites inside and outside Greece, and lists the rest without a pin', () => {
    expect(pins.map((pin) => pin.id)).toEqual([
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
    ]);
    expect(pins.some((pin) => pin.id === 's14' || pin.id === 's10' || pin.id === 's9')).toBe(false);
  });

  it('attaches myths only to a mapped place named in the entry', () => {
    const delos = pins.find((pin) => pin.id === 's4');
    const delphi = pins.find((pin) => pin.id === 's2');
    const troy = pins.find((pin) => pin.id === 's8');
    expect(delos?.myths.map((myth) => myth.id).sort()).toEqual(['m1', 'm8']);
    expect(delphi?.myths.map((myth) => myth.id).sort()).toEqual(['m2', 'm9']);
    expect(troy?.myths.map((myth) => myth.id)).toEqual(['m12']);
    expect(pins.some((pin) => pin.myths.some((myth) => myth.id === 'm3' || myth.id === 'm22'))).toBe(false);
  });
});

describe('entryTitle', () => {
  it('uses the place or the opening name', () => {
    const sites = content.sections.sites ?? [];
    expect(entryTitle(sites.find((entry) => entry.id === 's2')!)).toBe('Delphi');
    expect(entryTitle(sites.find((entry) => entry.id === 's8')!)).toBe('Troy');
    expect(entryTitle(sites.find((entry) => entry.id === 's14')!)).toBe('Carthage');
    expect(entryTitle(content.sections.myths_places.find((entry) => entry.id === 'm9')!)).toBe('Delphi');
  });
});
