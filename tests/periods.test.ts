import { describe, expect, it } from 'vitest';
import { createHistoryClock } from '../src/clock';
import { loadCatalog } from '../src/data/load';
import { initialYear, periodCovers, periodsCovering, timelineBounds } from '../src/periods';
import { indexToYear, yearToIndex } from '../src/years';

const periods = loadCatalog().content.sections.periods ?? [];
const bounds = timelineBounds(periods);

describe('timeline', () => {
  it('runs from 900 BCE to 330 CE and skips year 0', () => {
    expect(bounds).toEqual({ first: -900, last: 330 });
    expect(yearToIndex(-1, bounds)).toBe(899);
    expect(yearToIndex(1, bounds)).toBe(900);
    expect(indexToYear(899, bounds)).toBe(-1);
    expect(indexToYear(900, bounds)).toBe(1);
    expect(initialYear(periods, bounds)).toBe(-480);
  });

  it('treats period ends as closed, including the Roman overlap', () => {
    const ids = (year: number) => periodsCovering(periods, year).map((period) => period.id);
    expect(ids(-700).sort()).toEqual(['per1', 'per2']);
    expect(ids(-100).sort()).toEqual(['per4', 'per5']);
    expect(ids(-480).sort()).toEqual(['per2', 'per3']);
    expect(periods.find((period) => period.id === 'per6' && periodCovers(period, -1100))).toBeUndefined();
  });

  it('steps from 1 BCE to 1 CE', () => {
    const clock = createHistoryClock(bounds, -1);
    clock.step(1);
    expect(clock.year).toBe(1);
    clock.step(-1);
    expect(clock.year).toBe(-1);
  });
});
