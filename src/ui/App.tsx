import { useEffect, useMemo, useRef, useState } from 'react';
import { createHistoryClock } from '../clock';
import { loadCatalog, sectionOf } from '../data/load';
import type { Entry } from '../data/schema';
import { pinMatches, type PlaceFilter } from '../explore';
import { GODS } from '../gods';
import { initialYear, periodMarks, periodsCovering, spanOf, timelineBounds } from '../periods';
import { bboxOf, buildPins, overviewBBox, pinForEntry, type Pin } from '../pins';
import { parseHash, sameRoute, writeHash, type Route } from '../routes';
import { formatYear, yearInside } from '../years';
import { createGlobe, type GlobeController } from '../globe/createGlobe';
import { FilterPopout } from './FilterPopout';
import { GodsPopout } from './GodsPopout';
import { IconButton } from './IconButton';
import { IconKnowledge, IconMinus, IconPlus, IconQuote, IconSources, IconTimeline } from './icons';
import { IndexPopout } from './IndexPopout';
import { bindLongPress } from './longPress';
import { SheetHost } from './Panels';
import { PlacesPopout } from './PlacesPopout';
import { SearchPopout } from './SearchPopout';
import { usePrefersSheet } from './Sheets';
import { TimeBar } from './TimeBar';

export function App() {
  const catalog = useMemo(() => loadCatalog(), []);
  const pins = useMemo(() => buildPins(catalog.content.sections), [catalog]);
  const bounds = useMemo(() => timelineBounds(catalog.content.sections.periods ?? []), [catalog]);
  const marks = useMemo(() => periodMarks(catalog.content.sections.periods ?? [], bounds), [catalog, bounds]);
  const clockRef = useRef<ReturnType<typeof createHistoryClock> | null>(null);
  if (!clockRef.current) clockRef.current = createHistoryClock(bounds, initialYear(catalog.content.sections.periods ?? [], bounds));
  const clock = clockRef.current;

  const mapNode = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeController | null>(null);
  const [year, setYear] = useState(() => clock.year);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(clock.loop);
  const [speed, setSpeed] = useState(clock.speed);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [godsOpen, setGodsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [mapReady, setMapReady] = useState(false);
  const sheetMode = usePrefersSheet();
  const routeRef = useRef(route);
  routeRef.current = route;
  const openRef = useRef({ places: false, gods: false, search: false, filter: false, index: false, playback: false });
  openRef.current = {
    places: placesOpen,
    gods: godsOpen,
    search: searchOpen,
    filter: filterOpen,
    index: indexOpen,
    playback: playbackOpen,
  };

  const visiblePins = useMemo(() => pins.filter((pin) => pinMatches(pin, filter)), [pins, filter]);

  const go = (next: Route) => {
    writeHash(next);
    setRoute((current) => (sameRoute(current, next) ? current : next));
  };

  useEffect(() => bindLongPress(), []);

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  useEffect(() => {
    const node = mapNode.current;
    const root = document.querySelector<HTMLElement>('#app');
    if (!node || !root) return;
    const globe = createGlobe(node, root);
    globeRef.current = globe;
    window.__greece = {
      map: globe.map,
      places: pins.map((pin) => ({ id: pin.id, lat: pin.lat, lng: pin.lng, title: pin.title })),
    };
    globe.onPick((hit) => {
      closePopouts();
      go(hit ? { kind: 'site', id: hit.id } : { kind: 'map' });
    });
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      root.dataset.ready = 'true';
    };
    void globe.ready.then(() => {
      globe.setPlaces(toMapPlaces(pins));
      const pin = focusPin(routeRef.current, pins);
      void globe.flyTo(pin ? bboxOf([pin], 0.45) : overviewBBox(pins)).finally(finish);
      window.setTimeout(finish, 2500);
      setMapReady(true);
    });
    return () => {
      globe.destroy();
      globeRef.current = null;
      delete window.__greece;
    };
    // The globe is created once. Later route changes fly from the route effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  useEffect(() => {
    globeRef.current?.setPlaces(toMapPlaces(visiblePins));
  }, [visiblePins]);

  useEffect(() => {
    const ids = highlightFor(route, pins);
    globeRef.current?.setHighlight(ids);
    const pin = focusPin(route, pins);
    if (!pin || !globeRef.current) return;
    if (route.kind === 'site' || route.kind === 'story' || route.kind === 'god') {
      const points = route.kind === 'god' ? godPins(route.id, pins) : [pin];
      if (points.length > 0) globeRef.current.flyTo(bboxOf(points, route.kind === 'god' ? 0.8 : 0.45));
    }
  }, [route, pins]);

  useEffect(() => {
    return clock.subscribe(() => {
      setPlaying(clock.playing);
      setLoop(clock.loop);
      setSpeed(clock.speed);
      setYear(clock.year);
    });
  }, [clock]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) return;
    root.dataset.year = String(year);
    root.dataset.playing = playing ? '1' : '0';
  }, [year, playing]);

  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      clock.advance(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clock]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!element?.closest('#play')) clock.pause();
      if (!element) return;
      if (openRef.current.places && !element.closest('#places-panel, #places-button')) setPlacesOpen(false);
      if (openRef.current.gods && !element.closest('#gods-panel, #gods-button')) setGodsOpen(false);
      if (openRef.current.search && !element.closest('#search-panel, #search-button')) setSearchOpen(false);
      if (openRef.current.filter && !element.closest('#filter-panel, #filter-button')) setFilterOpen(false);
      if (openRef.current.index && !element.closest('#index-panel, #index-button')) setIndexOpen(false);
      if (openRef.current.playback && !element.closest('#playback-popout, #playback-button, #tools-button, #year-button')) {
        setPlaybackOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        clock.pause();
        clock.step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        clock.pause();
        clock.step(-1);
      } else if (event.key === 'Escape') {
        closePopouts();
        go({ kind: 'map' });
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [clock]);

  const closePopouts = () => {
    setPlacesOpen(false);
    setGodsOpen(false);
    setSearchOpen(false);
    setFilterOpen(false);
    setIndexOpen(false);
    setPlaybackOpen(false);
  };

  const openSite = (id: string) => {
    closePopouts();
    go({ kind: 'site', id });
  };

  const openEntry = (entry: Entry) => {
    const section = sectionOf(catalog.content, entry.id);
    closePopouts();
    if (section === 'myths_places') {
      go({ kind: 'story', id: entry.id });
      return;
    }
    if (section === 'sites' && pins.some((pin) => pin.id === entry.id)) {
      go({ kind: 'site', id: entry.id });
      return;
    }
    go({ kind: 'entry', id: entry.id });
  };

  const openTimeline = (entry: Entry) => {
    closePopouts();
    if (entry.year != null && yearInside(entry.year, bounds)) {
      clock.pause();
      clock.setYear(entry.year);
      go({ kind: 'map' });
      return;
    }
    go({ kind: 'entry', id: entry.id });
  };

  const activePeriods = periodsCovering(catalog.content.sections.periods ?? [], year);
  const yearLabel = formatYear(year);
  const shownPlaces = visiblePins;

  return (
    <>
      <div id="map" ref={mapNode} />
      <p className="wordmark">Ancient Greece</p>
      <div className="zoom">
        <IconButton label="Zoom in" onClick={() => globeRef.current?.zoomIn()}>
          <IconPlus />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => globeRef.current?.zoomOut()}>
          <IconMinus />
        </IconButton>
      </div>
      <div className="key-wrap">
        <PlacesPopout
          pins={shownPlaces}
          open={placesOpen}
          onToggle={() => {
            setGodsOpen(false);
            setSearchOpen(false);
            setFilterOpen(false);
            setIndexOpen(false);
            setPlaybackOpen(false);
            setPlacesOpen((open) => !open);
          }}
          onSelect={openSite}
        />
        <GodsPopout
          open={godsOpen}
          selectedId={route.kind === 'god' ? route.id : null}
          onToggle={() => {
            setPlacesOpen(false);
            setSearchOpen(false);
            setFilterOpen(false);
            setIndexOpen(false);
            setPlaybackOpen(false);
            setGodsOpen((open) => !open);
          }}
          onSelect={(id) => {
            if (!GODS.some((item) => item.id === id)) return;
            closePopouts();
            go({ kind: 'god', id });
          }}
        />
        <SearchPopout
          open={searchOpen}
          sections={catalog.content.sections}
          onToggle={() => {
            setPlacesOpen(false);
            setGodsOpen(false);
            setFilterOpen(false);
            setIndexOpen(false);
            setPlaybackOpen(false);
            setSearchOpen((open) => !open);
          }}
          onSelect={openEntry}
        />
        <FilterPopout
          open={filterOpen}
          filter={filter}
          onToggle={() => {
            setPlacesOpen(false);
            setGodsOpen(false);
            setSearchOpen(false);
            setIndexOpen(false);
            setPlaybackOpen(false);
            setFilterOpen((open) => !open);
          }}
          onSelect={(next) => {
            setFilter(next);
            setFilterOpen(false);
          }}
        />
        <IconButton
          id="readings-button"
          label="Readings"
          expanded={route.kind === 'readings'}
          onClick={() => {
            closePopouts();
            go(route.kind === 'readings' ? { kind: 'map' } : { kind: 'readings' });
          }}
        >
          <IconQuote />
        </IconButton>
        <IconButton
          id="timeline-button"
          label="Timeline"
          expanded={route.kind === 'timeline'}
          onClick={() => {
            closePopouts();
            go(route.kind === 'timeline' ? { kind: 'map' } : { kind: 'timeline' });
          }}
        >
          <IconTimeline />
        </IconButton>
        <IconButton
          id="knowledge-button"
          label="Knowledge"
          expanded={route.kind === 'knowledge'}
          onClick={() => {
            closePopouts();
            go(route.kind === 'knowledge' ? { kind: 'map' } : { kind: 'knowledge' });
          }}
        >
          <IconKnowledge />
        </IconButton>
        <IndexPopout
          open={indexOpen}
          route={route}
          onToggle={() => {
            setPlacesOpen(false);
            setGodsOpen(false);
            setSearchOpen(false);
            setFilterOpen(false);
            setPlaybackOpen(false);
            setIndexOpen((open) => !open);
          }}
          onOpen={(next) => {
            closePopouts();
            go(sameRoute(route, next) ? { kind: 'map' } : next);
          }}
        />
        <IconButton
          id="sources-button"
          label="Sources"
          expanded={route.kind === 'sources'}
          onClick={() => {
            closePopouts();
            go(route.kind === 'sources' ? { kind: 'map' } : { kind: 'sources' });
          }}
        >
          <IconSources />
        </IconButton>
      </div>
      <TimeBar
        index={clock.index}
        max={spanOf(bounds) - 1}
        label={yearLabel}
        playing={playing}
        loop={loop}
        speed={speed}
        playbackOpen={playbackOpen}
        marks={marks}
        onIndex={(next) => {
          clock.pause();
          clock.setIndex(next);
        }}
        onTogglePlay={() => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clock.pause();
            clock.step(1);
            return;
          }
          clock.toggle();
        }}
        onStep={(delta) => {
          clock.pause();
          clock.step(delta);
        }}
        onSpeed={(yearsPerSecond) => clock.setSpeed(yearsPerSecond)}
        onLoop={() => clock.setLoop(!clock.loop)}
        onTogglePlayback={() => {
          setPlacesOpen(false);
          setGodsOpen(false);
          setSearchOpen(false);
          setFilterOpen(false);
          setIndexOpen(false);
          setPlaybackOpen((open) => !open);
        }}
        onOpenYear={() => {
          closePopouts();
          go({ kind: 'periods' });
        }}
      />
      <SheetHost
        route={route}
        pins={pins}
        sources={catalog.sources}
        sections={catalog.content.sections}
        periods={activePeriods}
        bounds={bounds}
        sheetMode={sheetMode}
        map={mapReady ? (globeRef.current?.map ?? null) : null}
        onClose={() => go({ kind: 'map' })}
        onOpen={openEntry}
        onTimeline={openTimeline}
        onCompare={(slot, id) => {
          if (route.kind !== 'compare') return;
          go({
            kind: 'compare',
            left: slot === 'left' ? id : route.left,
            right: slot === 'right' ? id : route.right,
          });
        }}
      />
    </>
  );
}

function focusPin(route: Route, pins: Pin[]): Pin | undefined {
  if (route.kind === 'site') return pins.find((pin) => pin.id === route.id);
  if (route.kind === 'story' || route.kind === 'entry') return pinForEntry(pins, route.id);
  if (route.kind === 'god') return godPins(route.id, pins)[0];
  return undefined;
}

function godPins(id: string, pins: Pin[]): Pin[] {
  const god = GODS.find((item) => item.id === id);
  if (!god) return [];
  return pins.filter((pin) => god.links.some((link) => pinForEntry([pin], link.entryId)));
}

function highlightFor(route: Route, pins: Pin[]): string[] | null {
  if (route.kind === 'site') return [route.id];
  if (route.kind === 'story' || route.kind === 'entry') {
    const pin = pinForEntry(pins, route.id);
    return pin ? [pin.id] : null;
  }
  if (route.kind === 'god') {
    const ids = godPins(route.id, pins).map((pin) => pin.id);
    return ids.length > 0 ? ids : null;
  }
  return null;
}

function toMapPlaces(pins: Pin[]) {
  return pins.map((pin) => ({
    id: pin.id,
    title: pin.title,
    lat: pin.lat,
    lng: pin.lng,
    myth: pin.myths.length > 0,
  }));
}

declare global {
  interface Window {
    __greece?: {
      map: GlobeController['map'];
      places: { id: string; lat: number; lng: number; title: string }[];
    };
  }
}
