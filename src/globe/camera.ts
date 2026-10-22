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
  if (camera?.center && camera.zoom != null) {
    map.easeTo({
      center: camera.center,
      zoom: Math.max(map.getMinZoom(), camera.zoom - 0.08),
      padding,
      duration: 800,
    });
    return;
  }
  map.easeTo({
    center: [(minLng + maxLng) / 2, Math.max(-70, Math.min(70, (minLat + maxLat) / 2))],
    zoom: Math.max(map.getMinZoom(), 4.8),
    padding,
    duration: 800,
  });
}

export function framePadding(): { top: number; bottom: number; left: number; right: number } {
  const zoom = visible('.zoom');
  const timeEl = document.querySelector('.time');
  const time = timeEl?.classList.contains('is-covered') ? null : visible('.time');
  const wordmark = visible('.wordmark');
  const sheet = visible('.event-sheet');
  const top = Math.max(56, (wordmark ? wordmark.bottom : 40) + 16);
  const right = (zoom?.width ?? 44) + 28;
  if (sheet && sheet.width > 40 && sheet.right < window.innerWidth * 0.7) {
    return {
      top,
      left: sheet.right + 16,
      right,
      bottom: time ? Math.max(24, window.innerHeight - time.top + 16) : 120,
    };
  }
  if (sheet && sheet.width > 40) {
    return {
      top,
      left: 36,
      right,
      bottom: Math.max(24, window.innerHeight - sheet.top + 16),
    };
  }
  return {
    top,
    left: 36,
    right,
    bottom: time ? Math.max(120, window.innerHeight - time.top + 20) : 140,
  };
}

function visible(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}
