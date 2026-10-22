/** Historical signed years. -480 is 480 BCE, 330 is 330 CE. There is no year 0. */

export interface YearBounds {
  /** Inclusive. */
  first: number;
  /** Inclusive. */
  last: number;
}

export function yearCount(bounds: YearBounds): number {
  if (bounds.first >= 0 || bounds.last <= 0) {
    return bounds.last - bounds.first + 1;
  }
  return -bounds.first + bounds.last;
}

export function yearToIndex(year: number, bounds: YearBounds): number {
  assertYear(year, bounds);
  if (year < 0) return year - bounds.first;
  if (bounds.first >= 0) return year - bounds.first;
  return -bounds.first + year - 1;
}

export function indexToYear(index: number, bounds: YearBounds): number {
  const span = yearCount(bounds);
  const clamped = Math.min(span - 1, Math.max(0, Math.floor(index)));
  if (bounds.first >= 0 || bounds.last <= 0) return bounds.first + clamped;
  if (clamped < -bounds.first) return bounds.first + clamped;
  return clamped - -bounds.first + 1;
}

function assertYear(year: number, bounds: YearBounds): void {
  if (!Number.isInteger(year) || year === 0) throw new Error('There is no year 0');
  if (year < bounds.first || year > bounds.last) throw new Error('Year is outside the timeline');
}

export function yearInside(year: number, bounds: YearBounds): boolean {
  return Number.isInteger(year) && year !== 0 && year >= bounds.first && year <= bounds.last;
}

export function formatYear(year: number): string {
  if (!Number.isInteger(year) || year === 0) return '';
  const body = String(Math.abs(year));
  return year < 0 ? `${body} BCE` : `${body} CE`;
}
