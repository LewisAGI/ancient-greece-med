import { useEffect, useMemo, useRef, useState } from 'react';
import { createHistoryClock } from '../clock';
import { entryById, loadCatalog } from '../data/load';
import type { Entry } from '../data/schema';
import { GODS } from '../gods';
import { SOURCES_NOTICE } from '../notice';
import { initialYear, periodMarks, periodsCovering, spanOf, timelineBounds } from '../periods';
import { bboxOf, buildPins, overviewBBox, pinForEntry, type Pin } from '../pins';
import { readingEntries } from '../reading';
import { entryTitle, sectionHeading } from '../titles';
import { formatYear } from '../years';
import { createGlobe, type GlobeController } from '../globe/createGlobe';
import { GodsPopout } from './GodsPopout';
import { IconButton } from './IconButton';
import { IconKnowledge, IconMinus, IconPlus, IconQuote, IconSources } from './icons';
import { LabelBadge } from './LabelBadge';
import { bindLongPress } from './longPress';
import { PlacesPopout } from './PlacesPopout';
import { DesktopPopup, EntryBody, Panel, ReadingLines, SourceList, usePrefersSheet } from './Sheets';
import { TimeBar } from './TimeBar';

type SheetState =
  | { kind: 'site'; id: string }
  | { kind: 'entry'; id: string }
  | { kind: 'god'; id: string }
  | { kind: 'periods' }
  | { kind: 'knowledge' }
  | { kind: 'readings' }
  | { kind: 'sources' }
  | null;

export function App() {
  const catalog = useMemo(() => loadCatalog(), []);
  const pins = useMemo(() => buildPins(catalog.content.sections), [catalog]);
  const bounds = useMemo(() => timelineBounds(catalog.content.sections.periods ?? []), [catalog]);
  const readings = useMemo(() => readingEntries(catalog.content.sections), [catalog]);
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
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [mythOnly, setMythOnly] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const sheetMode = usePrefersSheet();
  const openRef = useRef({ places: false, gods: false, playback: false });
  openRef.current = { places: placesOpen, gods: godsOpen, playback: playbackOpen };

  const visiblePins = mythOnly ? pins.filter((pin) => pin.myths.length > 0) : pins;

  useEffect(() => bindLongPress(), []);

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
      setPlacesOpen(false);
      setGodsOpen(false);
      setPlaybackOpen(false);
      setSheet(hit ? { kind: 'site', id: hit.id } : null);
    });
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      root.dataset.ready = 'true';
    };
    void globe.ready.then(() => {
      globe.setPlaces(toMapPlaces(pins));
      globe.flyTo(overviewBBox(pins));
      globe.map.once('moveend', finish);
      window.setTimeout(finish, 1500);
    });
    return () => {
      globe.destroy();
      globeRef.current = null;
      delete window.__greece;
    };
  }, [pins]);

  useEffect(() => {
    globeRef.current?.setPlaces(toMapPlaces(visiblePins));
  }, [visiblePins]);

  useEffect(() => {
    const ids = highlightFor(sheet, pins);
    globeRef.current?.setHighlight(ids);
  }, [sheet, pins]);

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
        setPlacesOpen(false);
        setGodsOpen(false);
        setPlaybackOpen(false);
        setSheet(null);
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
    setPlaybackOpen(false);
  };

  const openSite = (id: string) => {
    const pin = pins.find((item) => item.id === id);
    if (!pin) return;
    closePopouts();
    setSheet({ kind: 'site', id });
    globeRef.current?.flyTo(bboxOf([pin], 0.45));
  };

  const openEntry = (entry: Entry) => {
    const pin = pinForEntry(pins, entry.id);
    closePopouts();
    if (pin) {
      setSheet({ kind: 'site', id: pin.id });
      globeRef.current?.flyTo(bboxOf([pin], 0.45));
      return;
    }
    setSheet({ kind: 'entry', id: entry.id });
  };

  const activePeriods = periodsCovering(catalog.content.sections.periods ?? [], year);
  const yearLabel = formatYear(year);

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
          pins={pins}
          open={placesOpen}
          mythOnly={mythOnly}
          onToggle={() => {
            setGodsOpen(false);
            setPlaybackOpen(false);
            setPlacesOpen((open) => !open);
          }}
          onToggleMyth={() => setMythOnly((value) => !value)}
          onSelect={openSite}
        />
        <GodsPopout
          open={godsOpen}
          selectedId={sheet?.kind === 'god' ? sheet.id : null}
          onToggle={() => {
            setPlacesOpen(false);
            setPlaybackOpen(false);
            setGodsOpen((open) => !open);
          }}
          onSelect={(id) => {
            const god = GODS.find((item) => item.id === id);
            if (!god) return;
            closePopouts();
            setSheet({ kind: 'god', id });
            const linked = pins.filter((pin) => god.links.some((link) => pinForEntry([pin], link.entryId)));
            if (linked.length > 0) globeRef.current?.flyTo(bboxOf(linked, 0.8));
          }}
        />
        <IconButton
          id="readings-button"
          label="Readings"
          expanded={sheet?.kind === 'readings'}
          onClick={() => {
            closePopouts();
            setSheet((current) => (current?.kind === 'readings' ? null : { kind: 'readings' }));
          }}
        >
          <IconQuote />
        </IconButton>
        <IconButton
          id="knowledge-button"
          label="Knowledge"
          expanded={sheet?.kind === 'knowledge'}
          onClick={() => {
            closePopouts();
            setSheet((current) => (current?.kind === 'knowledge' ? null : { kind: 'knowledge' }));
          }}
        >
          <IconKnowledge />
        </IconButton>
        <IconButton
          id="sources-button"
          label="Sources"
          expanded={sheet?.kind === 'sources'}
          onClick={() => {
            closePopouts();
            setSheet((current) => (current?.kind === 'sources' ? null : { kind: 'sources' }));
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
          setPlaybackOpen((open) => !open);
        }}
        onOpenYear={() => {
          closePopouts();
          setSheet({ kind: 'periods' });
        }}
      />
      <SheetHost
        sheet={sheet}
        pins={pins}
        readings={readings}
        periods={activePeriods}
        sources={catalog.sources}
        sections={catalog.content.sections}
        sheetMode={sheetMode}
        map={globeRef.current?.map ?? null}
        onClose={() => setSheet(null)}
        onOpen={openEntry}
      />
    </>
  );
}

function SheetHost({
  sheet,
  pins,
  readings,
  periods,
  sources,
  sections,
  sheetMode,
  map,
  onClose,
  onOpen,
}: {
  sheet: SheetState;
  pins: Pin[];
  readings: Entry[];
  periods: Entry[];
  sources: ReturnType<typeof loadCatalog>['sources'];
  sections: ReturnType<typeof loadCatalog>['content']['sections'];
  sheetMode: boolean;
  map: GlobeControllerMap | null;
  onClose: () => void;
  onOpen: (entry: Entry) => void;
}) {
  if (!sheet) return null;
  if (sheet.kind === 'site') {
    const pin = pins.find((item) => item.id === sheet.id);
    if (!pin) return null;
    const body = <EntryBody entry={pin.entry} sources={sources} myths={pin.myths} />;
    if (sheetMode || !map) return <Panel sheet label={pin.title} onClose={onClose}>{body}</Panel>;
    return (
      <DesktopPopup key={pin.id} map={map} lng={pin.lng} lat={pin.lat} onClose={onClose}>
        {body}
      </DesktopPopup>
    );
  }
  if (sheet.kind === 'entry') {
    const entry = findEntry(sections, sheet.id);
    if (!entry) return null;
    return (
      <Panel sheet={sheetMode} label={entryTitle(entry)} onClose={onClose}>
        <EntryBody entry={entry} sources={sources} />
      </Panel>
    );
  }
  if (sheet.kind === 'god') {
    const god = GODS.find((item) => item.id === sheet.id);
    if (!god) return null;
    return (
      <Panel sheet={sheetMode} label={god.name} onClose={onClose}>
        <div className="sheet-copy">
          <h2 className="popup-title">{god.name}</h2>
          {god.links.map((link) => {
            const entry = findEntry(sections, link.entryId);
            if (!entry) return null;
            return (
              <article key={`${link.entryId}-${link.relation}`} className="myth-card" data-entry={entry.id}>
                <p className="popup-place">{link.relation === 'born' ? 'Born' : 'Worshipped'}</p>
                <p className="badge-row">
                  <LabelBadge label={entry.label} />
                </p>
                <p className="popup-summary">{entry.text}</p>
                <ReadingLines entry={entry} sources={sources} />
                <button type="button" className="text-link" onClick={() => onOpen(entry)}>
                  {entryTitle(entry)}
                </button>
              </article>
            );
          })}
        </div>
      </Panel>
    );
  }
  if (sheet.kind === 'periods') {
    return (
      <Panel sheet={sheetMode} label="Period" onClose={onClose}>
        <div className="sheet-copy">
          {periods.map((period) => (
            <article key={period.id} className="myth-card" data-entry={period.id}>
              <h2 className="popup-title">{entryTitle(period)}</h2>
              <p className="badge-row">
                <LabelBadge label={period.label} />
              </p>
              <p className="popup-summary">{period.text}</p>
              <SourceList ids={period.sources} sources={sources} />
            </article>
          ))}
        </div>
      </Panel>
    );
  }
  if (sheet.kind === 'knowledge') {
    return (
      <Panel sheet={sheetMode} label="Knowledge" onClose={onClose}>
        <div className="sheet-copy">
          {Object.entries(sections).map(([key, entries]) => (
            <section key={key} className="knowledge-section">
              <h2 className="popup-title">{sectionHeading(key)}</h2>
              <ul className="knowledge-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="knowledge-row"
                      data-entry={entry.id}
                      onClick={() => onOpen(entry)}
                    >
                      <span>{entryTitle(entry)}</span>
                      <LabelBadge label={entry.label} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>
    );
  }
  if (sheet.kind === 'readings') {
    return (
      <Panel sheet={sheetMode} label="Readings" onClose={onClose}>
        <div className="sheet-copy">
          {readings.map((entry) => (
            <article key={entry.id} className="myth-card" data-entry={entry.id}>
              <h2 className="popup-title">{entry.primary_text ?? entryTitle(entry)}</h2>
              <p className="badge-row">
                <LabelBadge label={entry.label} />
              </p>
              <p className="popup-summary">{entry.text}</p>
              <ReadingLines entry={entry} sources={sources} />
              <SourceList ids={entry.sources} sources={sources} />
            </article>
          ))}
        </div>
      </Panel>
    );
  }
  return (
    <Panel sheet={sheetMode} label="Sources" onClose={onClose}>
      <div className="sheet-copy" id="sources-notice">
        <p className="popup-summary">{SOURCES_NOTICE}</p>
        <ul className="sources">
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              {' · '}
              {source.author_org}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

type GlobeControllerMap = NonNullable<GlobeController['map']>;

function findEntry(sections: Record<string, Entry[]>, id: string): Entry | undefined {
  return entryById({ meta: { pack: '', version: 0, created: '' }, sections }, id);
}

function highlightFor(sheet: SheetState, pins: Pin[]): string[] | null {
  if (!sheet) return null;
  if (sheet.kind === 'site') return [sheet.id];
  if (sheet.kind === 'entry') {
    const pin = pinForEntry(pins, sheet.id);
    return pin ? [pin.id] : null;
  }
  if (sheet.kind === 'god') {
    const god = GODS.find((item) => item.id === sheet.id);
    if (!god) return null;
    const ids = pins.filter((pin) => god.links.some((link) => pinForEntry([pin], link.entryId))).map((pin) => pin.id);
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
