import { indexToYear, yearCount, yearToIndex, type YearBounds } from './years';

export interface HistoryClock {
  readonly year: number;
  readonly index: number;
  readonly speed: number;
  readonly loop: boolean;
  readonly playing: boolean;
  readonly bounds: YearBounds;
  subscribe(listener: () => void): () => void;
  setYear(year: number): void;
  setIndex(index: number): void;
  setSpeed(yearsPerSecond: number): void;
  setLoop(loop: boolean): void;
  play(): void;
  pause(): void;
  toggle(): void;
  step(delta: number): void;
  /** Move the playhead. Listeners fire when the year or the playback state changes. */
  advance(ms: number): void;
}

export function createHistoryClock(bounds: YearBounds, startYear: number): HistoryClock {
  const span = yearCount(bounds);
  let cursor = yearToIndex(startYear, bounds);
  let speed = 40;
  let loop = true;
  let playing = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    get year() {
      return indexToYear(cursor, bounds);
    },
    get index() {
      return Math.floor(cursor);
    },
    get speed() {
      return speed;
    },
    get loop() {
      return loop;
    },
    get playing() {
      return playing;
    },
    get bounds() {
      return bounds;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setYear(year) {
      cursor = yearToIndex(year, bounds);
      emit();
    },
    setIndex(index) {
      cursor = Math.min(span - 1, Math.max(0, index));
      emit();
    },
    setSpeed(yearsPerSecond) {
      speed = yearsPerSecond;
      emit();
    },
    setLoop(next) {
      loop = next;
      emit();
    },
    play() {
      if (playing) return;
      if (!loop && cursor >= span - 1) return;
      playing = true;
      emit();
    },
    pause() {
      if (!playing) return;
      playing = false;
      emit();
    },
    toggle() {
      if (playing) this.pause();
      else this.play();
    },
    step(delta) {
      const next = Math.floor(cursor) + delta;
      if (!loop && (next >= span || next < 0)) {
        cursor = Math.min(span - 1, Math.max(0, next));
        if (playing) playing = false;
        emit();
        return;
      }
      cursor = wrap(next, span);
      emit();
    },
    advance(ms) {
      if (!playing || ms <= 0) return;
      const before = Math.floor(cursor);
      const next = cursor + (speed * ms) / 1000;
      if (!loop && next >= span) {
        cursor = span - 1;
        playing = false;
        emit();
        return;
      }
      cursor = wrap(next, span);
      if (Math.floor(cursor) !== before || !playing) emit();
    },
  };
}

function wrap(value: number, span: number): number {
  const wrapped = value % span;
  return wrapped < 0 ? wrapped + span : wrapped;
}
