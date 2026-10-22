import type { Entry } from './data/schema';
import { entryTitle } from './titles';
import { indexToYear, yearCount, yearToIndex, type YearBounds } from './years';

export interface YearBoundsAndPeriods {
  bounds: YearBounds;
  dated: Entry[];
}

/** Closed-interval overlap. Touching an endpoint counts. There is no year 0, so a span may cross it. */
export function periodCovers(period: Entry, year: number): boolean {
  if (period.start == null || period.end == null || year === 0) return false;
  return period.start <= year && period.end >= year;
}

export function periodsCovering(periods: Entry[], year: number): Entry[] {
  return periods.filter((period) => periodCovers(period, year));
}

export function timelineBounds(periods: Entry[]): YearBounds {
  const dated = periods.filter((period) => period.start != null && period.end != null);
  if (dated.length === 0) throw new Error('The pack has no dated periods');
  return {
    first: Math.min(...dated.map((period) => period.start as number)),
    last: Math.max(...dated.map((period) => period.end as number)),
  };
}

export function initialYear(periods: Entry[], bounds: YearBounds): number {
  const classical = periods.find((period) => entryTitle(period).toLowerCase().startsWith('classical'));
  if (classical?.start != null && classical.start >= bounds.first && classical.start <= bounds.last) {
    return classical.start;
  }
  return bounds.first;
}

export interface PeriodMark {
  index: number;
  short: string;
}

export function periodMarks(periods: Entry[], bounds: YearBounds): PeriodMark[] {
  return periods
    .filter((period) => period.start != null && period.start >= bounds.first && period.start <= bounds.last)
    .map((period) => ({
      index: yearToIndex(period.start as number, bounds),
      short: shortName(entryTitle(period)),
    }));
}

export function indexForYear(year: number, bounds: YearBounds): number {
  return yearToIndex(year, bounds);
}

export function yearForIndex(index: number, bounds: YearBounds): number {
  return indexToYear(index, bounds);
}

export function spanOf(bounds: YearBounds): number {
  return yearCount(bounds);
}

function shortName(title: string): string {
  const word = title.split(/\s+/)[0] ?? title;
  if (word.length <= 4) return word;
  return word.slice(0, 3);
}
