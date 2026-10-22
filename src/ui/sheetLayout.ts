/** Portrait uses the bottom sheet. Short landscape uses the side sheet. */
export function prefersSheet(): boolean {
  if (window.innerHeight > window.innerWidth) return true;
  return window.innerHeight <= 800 && window.innerWidth <= 1366;
}

export function placeSheet(sheet: HTMLElement): void {
  const margin = 12;
  const gap = 8;
  const wordmark = visible('.wordmark');
  const time = document.querySelector('.time');
  const timeRect = time?.classList.contains('is-covered') ? null : visible('.time');
  const top = Math.round((wordmark ? wordmark.bottom : 40) + gap);
  const side = window.innerWidth > window.innerHeight && window.innerHeight <= 800 && window.innerWidth <= 1366;
  sheet.classList.remove('is-covering');
  sheet.classList.toggle('is-side', side);
  if (side) {
    clearSheetChrome();
    const tools = visible('.key-wrap');
    const toolCeiling = tools && tools.width > tools.height + 8 ? tools.top : null;
    const timeCeiling = timeRect?.top ?? window.innerHeight - 112;
    const ceiling = toolCeiling == null ? timeCeiling : Math.min(toolCeiling, timeCeiling);
    const bottomEdge = Math.round(ceiling - gap);
    const width = Math.min(360, Math.floor(window.innerWidth * 0.42));
    const height = Math.max(140, bottomEdge - top);
    sheet.style.left = `${margin}px`;
    sheet.style.right = 'auto';
    sheet.style.top = `${top}px`;
    sheet.style.bottom = 'auto';
    sheet.style.width = `${width}px`;
    sheet.style.maxWidth = 'none';
    sheet.style.height = `${height}px`;
    sheet.style.maxHeight = `${height}px`;
    raiseZoomAboveSheet(sheet);
    return;
  }
  const shortPortrait = window.innerHeight > window.innerWidth && window.innerHeight <= 670;
  if (shortPortrait) {
    sheet.classList.add('is-covering');
    document.querySelector('.time')?.classList.add('is-covered');
    document.querySelector('.key-wrap')?.classList.add('is-covered');
    document.querySelector('.maplibregl-ctrl-bottom-right')?.classList.add('is-covered');
  } else {
    clearSheetChrome();
  }
  const controlTop = timeRect && !shortPortrait ? timeRect.top : window.innerHeight - margin;
  const bottom = shortPortrait ? margin : Math.max(margin, window.innerHeight - controlTop + gap);
  const available = window.innerHeight - bottom - top;
  const maxHeight = Math.min(window.innerHeight * 0.46, Math.max(120, available));
  sheet.style.left = `${margin}px`;
  sheet.style.right = `${margin}px`;
  sheet.style.top = 'auto';
  sheet.style.bottom = `${bottom}px`;
  sheet.style.width = 'auto';
  sheet.style.height = 'auto';
  sheet.style.maxWidth = 'none';
  sheet.style.maxHeight = `${Math.floor(maxHeight)}px`;
  raiseZoomAboveSheet(sheet);
}

export function clearSheetChrome(): void {
  document.querySelector('.time')?.classList.remove('is-covered');
  document.querySelector('.key-wrap')?.classList.remove('is-covered');
  document.querySelector('.maplibregl-ctrl-bottom-right')?.classList.remove('is-covered');
  const zoomEl = document.querySelector<HTMLElement>('.zoom');
  if (!zoomEl) return;
  zoomEl.classList.remove('is-raised', 'is-hidden');
  zoomEl.style.top = '';
  zoomEl.style.bottom = '';
  zoomEl.style.transform = '';
}

/** A bottom sheet on a phone runs through the zoom column. Lift the zoom clear of it. */
function raiseZoomAboveSheet(sheet: HTMLElement): void {
  const zoomEl = document.querySelector<HTMLElement>('.zoom');
  const sheetBox = sheet.getBoundingClientRect();
  if (!zoomEl || sheetBox.height < 2) return;
  const zoom = zoomEl.getBoundingClientRect();
  const overlaps = zoom.top < sheetBox.bottom - 1 && zoom.bottom > sheetBox.top - 1 && zoom.height > 2;
  if (!overlaps) return;
  const wordmark = document.querySelector('.wordmark')?.getBoundingClientRect();
  const topLimit = (wordmark && wordmark.height > 2 ? wordmark.bottom : 40) + 8;
  const nextTop = sheetBox.top - 8 - zoom.height;
  if (nextTop < topLimit) {
    zoomEl.classList.add('is-hidden');
    zoomEl.classList.remove('is-raised');
    zoomEl.style.transform = 'none';
    zoomEl.style.top = '-200px';
    zoomEl.style.bottom = 'auto';
    return;
  }
  zoomEl.classList.remove('is-hidden');
  zoomEl.classList.add('is-raised');
  zoomEl.style.transform = 'none';
  zoomEl.style.top = `${Math.round(nextTop)}px`;
  zoomEl.style.bottom = 'auto';
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Slide a desktop popup so it stays on screen and clear of the zoom, tools, and time bar. */
export function popupNudge(
  rect: Box,
  frame: { width: number; height: number },
  obstacles: Box[],
  margin = 12,
): { dx: number; dy: number } {
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  const width = right - left;
  const height = bottom - top;
  let dx = 0;
  let dy = 0;
  const apply = (sx: number, sy: number) => {
    dx += sx;
    dy += sy;
    left += sx;
    right += sx;
    top += sy;
    bottom += sy;
  };
  const fits = (sx: number, sy: number) => {
    const nextLeft = left + sx;
    const nextTop = top + sy;
    return (
      nextLeft >= margin - 0.5 &&
      nextLeft + width <= frame.width - margin + 0.5 &&
      nextTop >= margin - 0.5 &&
      nextTop + height <= frame.height - margin + 0.5
    );
  };
  if (right > frame.width - margin) apply(frame.width - margin - right, 0);
  if (left < margin) apply(margin - left, 0);
  if (height > frame.height - margin * 2) apply(0, margin - top);
  else {
    if (top < margin) apply(0, margin - top);
    if (bottom > frame.height - margin) apply(0, frame.height - margin - bottom);
  }
  for (let pass = 0; pass < 2; pass += 1) {
    obstacles.forEach((obstacle) => {
      const overlaps = right > obstacle.left && left < obstacle.right && bottom > obstacle.top && top < obstacle.bottom;
      if (!overlaps) return;
      const options = [
        { sx: -(right - obstacle.left + margin), sy: 0 },
        { sx: obstacle.right - left + margin, sy: 0 },
        { sx: 0, sy: -(bottom - obstacle.top + margin) },
        { sx: 0, sy: obstacle.bottom - top + margin },
      ]
        .map((option) => ({ ...option, cost: Math.abs(option.sx) + Math.abs(option.sy) }))
        .filter((option) => fits(option.sx, option.sy))
        .sort((a, b) => a.cost - b.cost);
      const best = options[0];
      if (!best) return;
      apply(best.sx, best.sy);
    });
  }
  return { dx, dy };
}

function visible(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}
