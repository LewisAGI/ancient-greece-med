import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  LABEL_MIN_ZOOM,
  MAX_PIN_OFFSET,
  NUDGE_MIN_ZOOM,
  PIN_HIT,
  markerOffsets,
  overlappingGroups,
  visibleLabelIds,
  type LabelBox,
} from '../labels';
import { flyToBBox, framePadding, settlePins, type BBox } from './camera';
import { mapStyle } from './style';

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

/** Puts the count menu on the side of the badge that stays clear of pins and chrome. */
function placeClusterMenu(menu: HTMLElement, button: HTMLElement): void {
  menu.classList.remove('is-below', 'is-left', 'is-right');
  const anchor = button.getBoundingClientRect();
  const width = Math.max(180, menu.scrollWidth);
  const height = Math.min(window.innerHeight * 0.46, Math.max(menu.scrollHeight, menu.childElementCount * 28 + 16));
  const candidates = [
    { cls: '', left: anchor.left + anchor.width / 2 - width / 2, top: anchor.top - 8 - height },
    { cls: 'is-below', left: anchor.left + anchor.width / 2 - width / 2, top: anchor.bottom + 8 },
    { cls: 'is-left', left: anchor.left - 8 - width, top: anchor.top + anchor.height / 2 - height / 2 },
    { cls: 'is-right', left: anchor.right + 8, top: anchor.top + anchor.height / 2 - height / 2 },
  ];
  const pins = [...document.querySelectorAll<HTMLElement>('.pin')].filter((pin) => !pin.hidden);
  const obstacles = ['.key-wrap', '.time', '.zoom', '.maplibregl-ctrl-bottom-right']
    .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
    .filter((rect): rect is DOMRect => Boolean(rect && rect.width > 2 && rect.height > 2));
  const score = (box: { left: number; top: number }) => {
    const rect = { left: box.left, top: box.top, right: box.left + width, bottom: box.top + height };
    let penalty = 0;
    if (rect.left < 4) penalty += 40;
    if (rect.top < 4) penalty += 40;
    if (rect.right > window.innerWidth - 4) penalty += 40;
    if (rect.bottom > window.innerHeight - 4) penalty += 40;
    pins.forEach((pin) => {
      const hit = pin.getBoundingClientRect();
      if (hit.width < 2 || !rectsOverlap(rect, hit)) return;
      penalty += 12;
    });
    obstacles.forEach((hit) => {
      if (rectsOverlap(rect, hit)) penalty += 24;
    });
    return penalty;
  };
  const best = [...candidates].sort((a, b) => score(a) - score(b))[0];
  if (best?.cls) menu.classList.add(best.cls);
}

// Vite does not emit MapLibre's worker unless the URL is set. Without it the
// production build 404s and the land does not draw.
setWorkerUrl(workerUrl);

export interface MapPlace {
  id: string;
  title: string;
  lat: number;
  lng: number;
  myth: boolean;
}

export interface PickHit {
  id: string;
  lat: number;
  lng: number;
}

export interface GlobeController {
  map: MapLibreMap;
  ready: Promise<void>;
  setPlaces(places: MapPlace[]): void;
  setHighlight(ids: string[] | null): void;
  flyTo(bbox: BBox): Promise<void>;  zoomIn(): void;
  zoomOut(): void;
  onPick(handler: (hit: PickHit | null) => void): void;
  destroy(): void;
}

export function createGlobe(container: HTMLElement, root: HTMLElement): GlobeController {
  const narrow = container.clientWidth < 700;
  const map = new MapLibreMap({
    container,
    style: mapStyle(),
    center: [23.1, 38.05],
    zoom: narrow ? 4.5 : 5.15,
    minZoom: 0.8,
    maxZoom: 10,
    maxPitch: 0,
    pitchWithRotate: false,
    dragRotate: true,
    touchPitch: false,
    attributionControl: { compact: true, customAttribution: 'NASA Blue Marble · Natural Earth' },
    maplibreLogo: false,
    fadeDuration: 0,
  });

  let landRepainted = false;
  map.on('sourcedata', (event) => {
    if (landRepainted || event.sourceId !== 'land' || !event.isSourceLoaded) return;
    landRepainted = true;
    map.triggerRepaint();
    root.dataset.landRepaint = '1';
  });
  map.on('error', (event) => {
    const detail = event as { sourceId?: string; tile?: unknown };
    if (!detail.sourceId && !detail.tile) return;
    map.triggerRepaint();
    root.dataset.tileRepaint = '1';
  });

  const ready = new Promise<void>((resolve) => {
    let started = false;
    const setup = () => {
      if (started) return;
      started = true;
      map.setProjection({ type: 'globe' });
      root.dataset.projection = 'globe';
      map.setSky({
        'sky-color': '#070b12',
        'horizon-color': '#8ec5ff',
        'sky-horizon-blend': 0.36,
        'atmosphere-blend': 0.92,
      });
      resolve();
    };
    map.on('style.load', setup);
    if (map.isStyleLoaded()) setup();
  });

  let pickHandler: (hit: PickHit | null) => void = () => {};
  let places: MapPlace[] = [];
  let highlight: string[] | null = null;
  let swallowClick = false;
  let expandedMembers: string[] | null = null;
  const markers = new Map<string, { marker: Marker; button: HTMLButtonElement; label: HTMLElement; leader: HTMLElement }>();
  const clusters = new Map<string, { marker: Marker; button: HTMLButtonElement; menu: HTMLElement }>();

  const placeById = (id: string) => places.find((place) => place.id === id);

  let clusterSettle = 0;
  const focusCluster = (id: string) => {
    const members = id
      .split('-')
      .map((memberId) => placeById(memberId))
      .filter((place): place is MapPlace => Boolean(place));
    if (members.length === 0) return;
    const west = Math.min(...members.map((place) => place.lng));
    const east = Math.max(...members.map((place) => place.lng));
    const south = Math.min(...members.map((place) => place.lat));
    const north = Math.max(...members.map((place) => place.lat));
    const generation = ++clusterSettle;
    flyToBBox(map, [west - 0.35, south - 0.35, east + 0.35, north + 0.35]);
    map.once('moveend', () => {
      if (generation !== clusterSettle) return;
      settlePins(
        map,
        members.map((place) => ({ lng: place.lng, lat: place.lat })),
      );
      paintLabels();
    });
  };

  const paintLabels = () => {
    const show = map.getZoom() >= LABEL_MIN_ZOOM;
    const nudge = map.getZoom() >= NUDGE_MIN_ZOOM;
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    const pad = width > 2 ? framePadding() : { top: 56, right: 72, bottom: 140, left: 72 };
    const projected = places.map((place) => {
      const point = map.project([place.lng, place.lat]);
      return { id: place.id, x: point.x, y: point.y };
    });
    const shifts = markerOffsets(projected, {
      nudge,
      maxOffset: MAX_PIN_OFFSET,
      bounds: {
        left: pad.left,
        top: pad.top,
        right: Math.max(pad.left + 36, width - pad.right),
        bottom: Math.max(pad.top + 36, height - pad.bottom),
      },
    });
    const groups = overlappingGroups(projected, shifts, PIN_HIT);
    const grouped = new Set(groups.flatMap((group) => group.memberIds));
    // A zoom changes which pins share a badge. Keep the menu the tap opened
    // until those places separate or the badge is tapped again.
    if (expandedMembers && !map.isMoving() && !expandedMembers.some((id) => grouped.has(id))) {
      expandedMembers = null;
    }
    const expanded = new Set(expandedMembers ?? []);
    const boxes: LabelBox[] = projected.map((point) => {
      const shift = shifts.get(point.id) ?? { dx: 0, dy: 0 };
      const x = point.x + shift.dx;
      const y = point.y + shift.dy;
      return { id: point.id, left: x - 46, top: y + 6, right: x + 46, bottom: y + 22 };
    });
    const visible = show ? visibleLabelIds(boxes) : new Set<string>();
    const highlighted = new Set(highlight ?? []);
    places.forEach((place) => {
      const node = markers.get(place.id);
      if (!node) return;
      const shift = grouped.has(place.id) ? { dx: 0, dy: 0 } : (shifts.get(place.id) ?? { dx: 0, dy: 0 });
      node.marker.setOffset([shift.dx, shift.dy]);
      node.button.hidden = grouped.has(place.id);
      const length = Math.hypot(shift.dx, shift.dy);
      node.leader.hidden = grouped.has(place.id) || length < 2;
      if (length >= 2) {
        node.leader.style.width = `${length}px`;
        node.leader.style.transform = `rotate(${Math.atan2(-shift.dy, -shift.dx)}rad)`;
      }
      node.button.classList.toggle('is-myth', place.myth);
      node.button.classList.toggle('is-selected', highlight != null && highlighted.has(place.id));
      node.button.classList.toggle('is-dim', highlight != null && !highlighted.has(place.id));
      node.label.classList.toggle('is-on', !grouped.has(place.id) && visible.has(place.id));
    });
    const live = new Set(groups.map((group) => group.id));
    [...clusters.keys()].forEach((id) => {
      if (live.has(id)) return;
      clusters.get(id)?.marker.remove();
      clusters.delete(id);
    });
    groups.forEach((group) => {
      let node = clusters.get(group.id);
      if (!node) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cluster-badge';
        const menu = document.createElement('div');
        menu.className = 'cluster-menu';
        menu.hidden = true;
        const root = document.createElement('div');
        root.className = 'cluster';
        root.append(button, menu);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          swallowClick = true;
          const members = (button.dataset.members ?? '').split(' ').filter(Boolean);
          const id = button.dataset.cluster ?? '';
          if (!id || members.length === 0) return;
          if (button.getAttribute('aria-expanded') === 'true') {
            expandedMembers = null;
            paintLabels();
            return;
          }
          expandedMembers = members;
          focusCluster(id);
          paintLabels();
        });
        const marker = new Marker({ element: root, anchor: 'center' }).setLngLat([0, 0]).addTo(map);
        node = { marker, button, menu };
        clusters.set(group.id, node);
      }
      const members = group.memberIds
        .map((id) => placeById(id))
        .filter((place): place is MapPlace => Boolean(place));
      if (members.length === 0) return;
      const lng = members.reduce((sum, place) => sum + place.lng, 0) / members.length;
      const lat = members.reduce((sum, place) => sum + place.lat, 0) / members.length;
      node.marker.setLngLat([lng, lat]);
      node.button.dataset.cluster = group.id;
      node.button.dataset.members = group.memberIds.join(' ');
      node.button.textContent = String(group.memberIds.length);
      node.button.setAttribute('aria-label', `${group.memberIds.length} places`);
      const open = group.memberIds.some((id) => expanded.has(id));
      node.button.setAttribute('aria-expanded', open ? 'true' : 'false');
      node.menu.hidden = !open;
      node.menu.classList.remove('is-below', 'is-left', 'is-right');
      node.menu.replaceChildren();
      members.forEach((place) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.dataset.place = place.id;
        item.textContent = place.title;
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          swallowClick = true;
          expandedMembers = null;
          paintLabels();
          pickHandler({ id: place.id, lat: place.lat, lng: place.lng });
        });
        node?.menu.append(item);
      });
      if (open) placeClusterMenu(node.menu, node.button);
    });
  };

  const rebuild = () => {
    const next = new Set(places.map((place) => place.id));
    [...markers.keys()].forEach((id) => {
      if (next.has(id)) return;
      markers.get(id)?.marker.remove();
      markers.delete(id);
    });
    places.forEach((place) => {
      if (markers.has(place.id)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pin';
      button.dataset.tip = place.title;
      button.title = place.title;
      button.setAttribute('aria-label', place.title);
      button.dataset.place = place.id;
      const leader = document.createElement('span');
      leader.className = 'pin-leader';
      leader.hidden = true;
      const dot = document.createElement('span');
      dot.className = 'dot';
      const label = document.createElement('span');
      label.className = 'pin-label';
      label.textContent = place.title;
      button.append(leader, dot, label);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        swallowClick = true;
        pickHandler({ id: place.id, lat: place.lat, lng: place.lng });
      });
      const marker = new Marker({ element: button, anchor: 'center' }).setLngLat([place.lng, place.lat]).addTo(map);
      markers.set(place.id, { marker, button, label, leader });
    });
    paintLabels();
    root.dataset.places = String(places.length);
  };

  map.on('click', () => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    pickHandler(null);
  });
  map.on('move', paintLabels);
  map.on('moveend', paintLabels);
  map.on('zoomend', paintLabels);

  const onResize = () => map.resize();
  window.addEventListener('resize', onResize);

  return {
    map,
    ready,
    setPlaces(next) {
      places = next;
      void ready.then(() => rebuild());
    },
    setHighlight(ids) {
      highlight = ids;
      void ready.then(() => paintLabels());
    },
    flyTo(bbox) {
      return ready.then(
        () =>
          new Promise<void>((resolve) => {
            flyToBBox(map, bbox);
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              settlePins(
                map,
                places.map((place) => ({ lng: place.lng, lat: place.lat })),
              );
              paintLabels();
              resolve();
            };
            map.once('moveend', finish);
            window.setTimeout(() => {
              if (!map.isMoving()) finish();
            }, 900);
          }),
      );
    },
    zoomIn() {
      map.zoomIn({ duration: 200 });
    },
    zoomOut() {
      map.zoomOut({ duration: 200 });
    },
    onPick(handler) {
      pickHandler = handler;
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      markers.forEach((item) => item.marker.remove());
      markers.clear();
      clusters.forEach((item) => item.marker.remove());
      clusters.clear();
      map.remove();
    },
  };
}
