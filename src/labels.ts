export interface LabelBox {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Place names appear once the globe is close enough to Greece to read them. */
export const LABEL_MIN_ZOOM = 4.2;

/** Greedy screen-space collision. Earlier boxes win. */
export function visibleLabelIds(boxes: LabelBox[], gap = 6): Set<string> {
  const placed: LabelBox[] = [];
  const visible = new Set<string>();
  boxes.forEach((box) => {
    const blocked = placed.some((other) => overlaps(box, other, gap));
    if (blocked) return;
    placed.push(box);
    visible.add(box.id);
  });
  return visible;
}

function overlaps(a: LabelBox, b: LabelBox, gap: number): boolean {
  return !(a.right + gap < b.left || b.right + gap < a.left || a.bottom + gap < b.top || b.bottom + gap < a.top);
}

export interface MarkerPoint {
  id: string;
  x: number;
  y: number;
}

export interface MarkerFrame {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Pixel nudge so marker hit targets do not cover one another.
 * Northern pins keep their geographic point. A tight frame falls back to a
 * smaller gap that still leaves each center clickable.
 */
export function markerOffsets(
  points: MarkerPoint[],
  options?: { size?: number; gap?: number; bounds?: MarkerFrame },
): Map<string, { dx: number; dy: number }> {
  const size = options?.size ?? 32;
  const gap = options?.gap ?? 2;
  const bounds = options?.bounds;
  const comfortable = layoutMarkers(points, size + gap, size, bounds);
  if (comfortable) return comfortable;
  return layoutMarkers(points, size / 2 + gap, size, bounds) ?? identityOffsets(points);
}

function identityOffsets(points: MarkerPoint[]): Map<string, { dx: number; dy: number }> {
  return new Map(points.map((point) => [point.id, { dx: 0, dy: 0 }]));
}

function layoutMarkers(
  points: MarkerPoint[],
  min: number,
  size: number,
  bounds: MarkerFrame | undefined,
): Map<string, { dx: number; dy: number }> | null {
  const ordered = [...points].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const placed: MarkerPoint[] = [];
  const offsets = new Map<string, { dx: number; dy: number }>();
  const step = Math.max(1, Math.round(min));
  for (const point of ordered) {
    const spot = findSpot(point, placed, step, size / 2, bounds);
    if (!spot) return null;
    placed.push(spot);
    offsets.set(point.id, { dx: spot.x - point.x, dy: spot.y - point.y });
  }
  return offsets;
}

function findSpot(
  point: MarkerPoint,
  placed: MarkerPoint[],
  step: number,
  inset: number,
  bounds: MarkerFrame | undefined,
): MarkerPoint | null {
  for (const candidate of spiral(step)) {
    const x = Math.round(point.x + candidate.dx);
    const y = Math.round(point.y + candidate.dy);
    if (bounds && !insideFrame(x, y, inset, bounds)) continue;
    const blocked = placed.some((other) => Math.abs(other.x - x) < step && Math.abs(other.y - y) < step);
    if (blocked) continue;
    return { id: point.id, x, y };
  }
  return null;
}

function insideFrame(x: number, y: number, inset: number, bounds: MarkerFrame): boolean {
  return x - inset >= bounds.left && x + inset <= bounds.right && y - inset >= bounds.top && y + inset <= bounds.bottom;
}

/** Square rings, top edge first, so a crowded coast grows upward before it hits the time bar. */
function spiral(step: number): { dx: number; dy: number }[] {
  const cells: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }];
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) cells.push({ dx: dx * step, dy: -ring * step });
    for (let dy = -ring + 1; dy <= ring; dy += 1) cells.push({ dx: ring * step, dy: dy * step });
    for (let dx = ring - 1; dx >= -ring; dx -= 1) cells.push({ dx: dx * step, dy: ring * step });
    for (let dy = ring - 1; dy > -ring; dy -= 1) cells.push({ dx: -ring * step, dy: dy * step });
  }
  return cells;
}
