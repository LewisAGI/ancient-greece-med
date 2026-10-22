import type { Map as MapLibreMap } from 'maplibre-gl';

export type BBox = [number, number, number, number];

/**
 * One ease onto a bounds box. Padding keeps the time bar, the title, and an
 * open sheet out of the framed globe.
 */
export function flyToBBox(map: MapLibreMap, bbox: BBox): void {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const padding = framePadding();
  const camera = map.cameraForBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding, absolutePadding: true, maxZoom: 6.6 },
  );
  // cameraForBounds already applied padding. Passing it again shrinks the canvas
  // and paints markers outside that box.
  if (camera?.center && camera.zoom != null) {
    map.easeTo({
      center: camera.center,
      zoom: Math.max(map.getMinZoom(), camera.zoom - 0.08),
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: 800,
    });
    return;
  }
  map.easeTo({
    center: [(minLng + maxLng) / 2, Math.max(-70, Math.min(70, (minLat + maxLat) / 2))],
    zoom: Math.max(map.getMinZoom(), 4.8),
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
    duration: 800,
  });
}

/**
 * Globe projection puts edge pins lower than the fitted bounds. Pan, and zoom
 * out when needed, until every point sits in the padding box.
 */
export function settlePins(map: MapLibreMap, points: { lng: number; lat: number }[], attempt = 0): void {
  if (points.length === 0 || map.getContainer().clientWidth < 2) return;
  const pad = framePadding();
  const width = map.getContainer().clientWidth;
  const height = map.getContainer().clientHeight;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  points.forEach((point) => {
    const projected = map.project([point.lng, point.lat]);
    minX = Math.min(minX, projected.x);
    maxX = Math.max(maxX, projected.x);
    minY = Math.min(minY, projected.y);
    maxY = Math.max(maxY, projected.y);
  });
  const safeLeft = pad.left;
  const safeRight = width - pad.right;
  const safeTop = pad.top;
  const safeBottom = height - pad.bottom;
  const fits = maxX - minX <= safeRight - safeLeft - 4 && maxY - minY <= safeBottom - safeTop - 4;
  if (!fits && attempt < 4 && map.getZoom() > map.getMinZoom() + 0.05) {
    map.zoomTo(Math.max(map.getMinZoom(), map.getZoom() - 0.4), { duration: 0 });
    settlePins(map, points, attempt + 1);
    return;
  }
  const overflowLeft = safeLeft - minX;
  const overflowRight = maxX - safeRight;
  const overflowTop = safeTop - minY;
  const overflowBottom = maxY - safeBottom;
  if (overflowLeft <= 2 && overflowRight <= 2 && overflowTop <= 2 && overflowBottom <= 2) return;
  let dx = 0;
  let dy = 0;
  if (overflowLeft > 2) dx -= overflowLeft;
  if (overflowRight > 2) dx += overflowRight;
  if (overflowTop > 2) dy -= overflowTop;
  if (overflowBottom > 2) dy += overflowBottom;
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
  map.panBy([dx, dy], { duration: 0 });
  if (attempt < 5) settlePins(map, points, attempt + 1);
}

export function framePadding(): { top: number; bottom: number; left: number; right: number } {
  const zoom = visible('.zoom');
  const timeEl = document.querySelector('.time');
  const time = timeEl?.classList.contains('is-covered') ? null : visible('.time');
  const tools = visible('.key-wrap');
  const wordmark = visible('.wordmark');
  const sheet = visible('.event-sheet');
  const top = Math.max(56, (wordmark ? wordmark.bottom : 40) + 16);
  const right = (zoom?.width ?? 44) + 28;
  const rail = tools && tools.height > tools.width + 8 ? tools.right + 14 : 36;
  const toolRowTop = tools && tools.width > tools.height + 8 ? tools.top : null;
  const timeTop = time ? time.top : window.innerHeight - 120;
  const chromeTop = toolRowTop == null ? timeTop : Math.min(timeTop, toolRowTop);
  if (sheet && sheet.width > 40 && sheet.right < window.innerWidth * 0.7) {
    return {
      top,
      left: Math.max(rail, sheet.right + 16),
      right,
      bottom: Math.max(24, window.innerHeight - chromeTop + 18),
    };
  }
  if (sheet && sheet.width > 40) {
    return {
      top,
      left: rail,
      right,
      bottom: Math.max(24, window.innerHeight - sheet.top + 16),
    };
  }
  return {
    top,
    left: rail,
    right,
    bottom: Math.max(120, window.innerHeight - chromeTop + 22),
  };
}

function visible(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}
