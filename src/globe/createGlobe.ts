import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { LABEL_MIN_ZOOM, visibleLabelIds, type LabelBox } from '../labels';
import { flyToBBox, type BBox } from './camera';
import { mapStyle } from './style';

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
  flyTo(bbox: BBox): void;
  zoomIn(): void;
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
  const markers = new Map<string, { marker: Marker; button: HTMLButtonElement; label: HTMLElement }>();

  const paintLabels = () => {
    const show = map.getZoom() >= LABEL_MIN_ZOOM;
    const boxes: LabelBox[] = places.map((place) => {
      const point = map.project([place.lng, place.lat]);
      return { id: place.id, left: point.x - 46, top: point.y + 6, right: point.x + 46, bottom: point.y + 22 };
    });
    const visible = show ? visibleLabelIds(boxes) : new Set<string>();
    const highlighted = new Set(highlight ?? []);
    places.forEach((place) => {
      const node = markers.get(place.id);
      if (!node) return;
      node.button.classList.toggle('is-myth', place.myth);
      node.button.classList.toggle('is-selected', highlight != null && highlighted.has(place.id));
      node.button.classList.toggle('is-dim', highlight != null && !highlighted.has(place.id));
      node.label.classList.toggle('is-on', visible.has(place.id));
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
      const dot = document.createElement('span');
      dot.className = 'dot';
      const label = document.createElement('span');
      label.className = 'pin-label';
      label.textContent = place.title;
      button.append(dot, label);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        swallowClick = true;
        pickHandler({ id: place.id, lat: place.lat, lng: place.lng });
      });
      const marker = new Marker({ element: button, anchor: 'center' }).setLngLat([place.lng, place.lat]).addTo(map);
      markers.set(place.id, { marker, button, label });
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
      void ready.then(() => flyToBBox(map, bbox));
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
      map.remove();
    },
  };
}
