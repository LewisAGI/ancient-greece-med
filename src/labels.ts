export interface LabelBox {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Place names appear once the globe is close enough to Greece to read them. */
export const LABEL_MIN_ZOOM = 4.2;

/** Hit target of a pin, in CSS pixels. */
export const PIN_HIT = 32;

/** A nudge may not move a pin farther than this. About two pin widths. */
export const MAX_PIN_OFFSET = PIN_HIT * 2;

/** Below this zoom, pins stay on their geographic points and overlaps become a count. */
export const NUDGE_MIN_ZOOM = 5;

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
 * Northern pins keep their geographic point. Offsets stay inside maxOffset.
 * Pass `nudge: false` at low zoom so pins are not dragged across the map.
 */
export function markerOffsets(
  points: MarkerPoint[],
  options?: { size?: number; gap?: number; bounds?: MarkerFrame; maxOffset?: number; nudge?: boolean },
): Map<string, { dx: number; dy: number }> {
  if (options?.nudge === false) return identityOffsets(points);
  const size = options?.size ?? PIN_HIT;
  const gap = options?.gap ?? 2;
  const bounds = options?.bounds;
  const maxOffset = options?.maxOffset ?? size * 2;
  const comfortable = layoutMarkerSpots(points, size + gap, size, bounds, maxOffset);
  if (comfortable) return comfortable;
  return layoutMarkerSpots(points, size / 2 + gap, size, bounds, maxOffset) ?? identityOffsets(points);
}

export interface PinCluster {
  id: string;
  memberIds: string[];
}

/** Pins whose hit targets still overlap, after any nudge, share a count badge. */
export function overlappingGroups(
  points: MarkerPoint[],
  offsets: Map<string, { dx: number; dy: number }>,
  size = PIN_HIT,
): PinCluster[] {
  const placed = points.map((point) => {
    const shift = offsets.get(point.id) ?? { dx: 0, dy: 0 };
    return { id: point.id, x: point.x + shift.dx, y: point.y + shift.dy };
  });
  const parent = new Map(placed.map((point) => [point.id, point.id]));
  const find = (id: string): string => {
    const next = parent.get(id) ?? id;
    if (next === id) return id;
    const root = find(next);
    parent.set(id, root);
    return root;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      if (!a || !b) continue;
      if (Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size) unite(a.id, b.id);
    }
  }
  const groups = new Map<string, string[]>();
  placed.forEach((point) => {
    const root = find(point.id);
    const list = groups.get(root) ?? [];
    list.push(point.id);
    groups.set(root, list);
  });
  const clusters: PinCluster[] = [];
  groups.forEach((memberIds) => {
    if (memberIds.length < 2) return;
    const sorted = [...memberIds].sort();
    clusters.push({ id: sorted.join('-'), memberIds: sorted });
  });
  return clusters;
}

function identityOffsets(points: MarkerPoint[]): Map<string, { dx: number; dy: number }> {
  return new Map(points.map((point) => [point.id, { dx: 0, dy: 0 }]));
}

function layoutMarkerSpots(
  points: MarkerPoint[],
  min: number,
  size: number,
  bounds: MarkerFrame | undefined,
  maxOffset: number,
): Map<string, { dx: number; dy: number }> | null {
  const ordered = [...points].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const placed: MarkerPoint[] = [];
  const offsets = new Map<string, { dx: number; dy: number }>();
  const step = Math.max(1, Math.round(min));
  for (const point of ordered) {
    const spot = findSpot(point, placed, step, size / 2, bounds, maxOffset);
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
  maxOffset: number,
): MarkerPoint | null {
  for (const candidate of spiral(step, maxOffset)) {
    const x = Math.round(point.x + candidate.dx);
    const y = Math.round(point.y + candidate.dy);
    if (Math.hypot(x - point.x, y - point.y) > maxOffset + 0.5) continue;
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

/** Square rings, top edge first, stopped once a ring would exceed the offset cap. */
function spiral(step: number, maxOffset: number): { dx: number; dy: number }[] {
  const cells: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }];
  for (let ring = 1; ring <= 8 && ring * step <= maxOffset + 0.5; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) cells.push({ dx: dx * step, dy: -ring * step });
    for (let dy = -ring + 1; dy <= ring; dy += 1) cells.push({ dx: ring * step, dy: dy * step });
    for (let dx = ring - 1; dx >= -ring; dx -= 1) cells.push({ dx: dx * step, dy: ring * step });
    for (let dy = ring - 1; dy > -ring; dy -= 1) cells.push({ dx: -ring * step, dy: dy * step });
  }
  return cells;
}
