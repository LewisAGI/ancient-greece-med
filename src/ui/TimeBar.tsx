import { useLayoutEffect, useRef } from 'react';
import type { PeriodMark } from '../periods';
import { IconButton } from './IconButton';
import { IconChevron, IconLoop, IconPause, IconPlay, IconPlayback, IconSpeed } from './icons';

export const PLAYBACK_SPEEDS = [
  { label: 'Slow', yearsPerSecond: 12, bars: 1 },
  { label: 'Steady', yearsPerSecond: 40, bars: 2 },
  { label: 'Fast', yearsPerSecond: 120, bars: 3 },
  { label: 'Swift', yearsPerSecond: 400, bars: 4 },
] as const;

interface TimeBarProps {
  index: number;
  max: number;
  label: string;
  playing: boolean;
  loop: boolean;
  speed: number;
  playbackOpen: boolean;
  marks: PeriodMark[];
  onIndex: (index: number) => void;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
  onSpeed: (yearsPerSecond: number) => void;
  onLoop: () => void;
  onTogglePlayback: () => void;
  onOpenYear: () => void;
}

export function TimeBar({
  index,
  max,
  label,
  playing,
  loop,
  speed,
  playbackOpen,
  marks,
  onIndex,
  onTogglePlay,
  onStep,
  onSpeed,
  onLoop,
  onTogglePlayback,
  onOpenYear,
}: TimeBarProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ticks = ticksRef.current;
    const markRow = marksRef.current;
    const thumb = buttonRef.current;
    const slider = sliderRef.current;
    if (!ticks || !markRow || !thumb || !slider) return;
    paintTicks(ticks);
    paintMarks(markRow, marks, max);
    placeThumb(thumb, slider);
    separateMarks(markRow, thumb);
  });

  return (
    <div className="time">
      <div className="thumb-band">
        <button
          type="button"
          id="year-button"
          className="thumb-label"
          ref={buttonRef}
          aria-label={label}
          onClick={onOpenYear}
        >
          {label}
        </button>
        <IconButton id="tools-button" className="tools-button" label="Playback" expanded={playbackOpen} onClick={onTogglePlayback}>
          <IconPlayback />
        </IconButton>
      </div>
      <div className="time-row">
        <IconButton label="Previous year" onClick={() => onStep(-1)}>
          <IconChevron direction="left" />
        </IconButton>
        <IconButton id="play" label={playing ? 'Pause' : 'Play'} pressed={playing} onClick={onTogglePlay}>
          {playing ? <IconPause /> : <IconPlay />}
        </IconButton>
        <div className="ruler">
          <div className="ticks" id="ticks" ref={ticksRef} aria-hidden="true" />
          <div className="era-labels" id="period-labels" ref={marksRef} aria-hidden="true" />
          <input
            id="slider"
            ref={sliderRef}
            type="range"
            min={0}
            max={max}
            step={1}
            value={index}
            aria-label="Year"
            aria-valuetext={label}
            onChange={(event) => onIndex(Number(event.target.value))}
          />
        </div>
        <IconButton label="Next year" onClick={() => onStep(1)}>
          <IconChevron direction="right" />
        </IconButton>
        <IconButton id="playback-button" label="Playback" expanded={playbackOpen} onClick={onTogglePlayback}>
          <IconPlayback />
        </IconButton>
      </div>
      <div id="playback-popout" className="popout" hidden={!playbackOpen}>
        {PLAYBACK_SPEEDS.map((option) => (
          <IconButton
            key={option.label}
            label={option.label}
            pressed={speed === option.yearsPerSecond}
            onClick={() => onSpeed(option.yearsPerSecond)}
          >
            <IconSpeed bars={option.bars} />
          </IconButton>
        ))}
        <IconButton className="loop-option" label="Loop" pressed={loop} onClick={onLoop}>
          <IconLoop />
        </IconButton>
      </div>
    </div>
  );
}

function paintTicks(ticks: HTMLElement) {
  const width = ticks.clientWidth;
  if (width < 8) return;
  const count = 8;
  ticks.replaceChildren();
  for (let mark = 0; mark < count; mark += 1) {
    const tick = document.createElement('span');
    tick.className = 'tick is-major';
    tick.style.left = `${(mark / (count - 1)) * 100}%`;
    ticks.append(tick);
  }
}

function paintMarks(row: HTMLElement, marks: PeriodMark[], max: number) {
  row.replaceChildren();
  marks.forEach((mark) => {
    const node = document.createElement('span');
    node.className = 'era-tick';
    node.textContent = mark.short;
    const ratio = max <= 0 ? 0 : mark.index / max;
    node.style.left = `${ratio * 100}%`;
    node.style.transform = ratio <= 0.02 ? 'translateX(0)' : ratio >= 0.98 ? 'translateX(-100%)' : 'translateX(-50%)';
    row.append(node);
  });
}

function placeThumb(thumb: HTMLElement, slider: HTMLInputElement) {
  const band = thumb.parentElement;
  const card = band?.closest<HTMLElement>('.time');
  if (!band || !card) return;
  const max = Number(slider.max) || 1;
  const ratio = Number(slider.value) / max;
  const sliderRect = slider.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  if (bandRect.width < 8 || sliderRect.width < 2) return;
  const center = sliderRect.left + 2 + ratio * (sliderRect.width - 4);
  const half = thumb.getBoundingClientRect().width / 2;
  const tools = document.querySelector<HTMLElement>('#tools-button');
  let minCenter = cardRect.left + half + 2;
  let maxCenter = cardRect.right - half - 2;
  if (tools && tools.offsetParent) {
    const toolsRect = tools.getBoundingClientRect();
    if (toolsRect.width > 2) maxCenter = Math.min(maxCenter, toolsRect.left - half - 5);
  }
  const lo = Math.min(minCenter, maxCenter) - bandRect.left;
  const hi = Math.max(minCenter, maxCenter) - bandRect.left;
  const x = Math.min(Math.max(center - bandRect.left, lo), hi);
  thumb.style.left = `${x}px`;
}

function separateMarks(row: HTMLElement, thumb: HTMLElement) {
  const labels = [...row.querySelectorAll<HTMLElement>('.era-tick')];
  labels.forEach((node) => {
    node.hidden = false;
  });
  const thumbRect = thumb.getBoundingClientRect();
  const hits = (a: DOMRect, b: DOMRect) =>
    a.width > 1 && b.width > 1 && a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom && a.bottom > b.top;
  const kept: HTMLElement[] = [];
  labels.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const blocked = hits(rect, thumbRect) || kept.some((other) => hits(rect, other.getBoundingClientRect()));
    node.hidden = blocked;
    if (!blocked) kept.push(node);
  });
}
