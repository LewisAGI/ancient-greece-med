import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Popup, type Map as MapLibreMap } from 'maplibre-gl';
import type { Entry, SourceRecord } from '../data/schema';
import { relatedEntries } from '../explore';
import { entryCredits } from '../reading';
import { entryTitle } from '../titles';
import { formatYear } from '../years';
import { LabelBadge } from './LabelBadge';
import { clearSheetChrome, placeSheet, popupNudge, prefersSheet } from './sheetLayout';

export function usePrefersSheet(): boolean {
  const [sheet, setSheet] = useState(() => prefersSheet());
  useEffect(() => {
    const onResize = () => setSheet(prefersSheet());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return sheet;
}

export function EntryBody({
  entry,
  sources,
  myths = [],
  sections,
  onOpen,
}: {
  entry: Entry;
  sources: SourceRecord[];
  myths?: Entry[];
  sections?: Record<string, Entry[]>;
  onOpen?: (entry: Entry) => void;
}) {
  const skip = new Set([entry.id, ...myths.map((myth) => myth.id)]);
  return (
    <div className="sheet-copy" data-entry={entry.id}>
      <h2 className="popup-title">{entryTitle(entry)}</h2>
      <p className="badge-row">
        <LabelBadge label={entry.label} />
      </p>
      <p className="popup-summary">{entry.text}</p>
      {entry.citation ? <p className="citation">{entry.citation}</p> : null}
      <ReadingLines entry={entry} sources={sources} />
      <FactList entry={entry} />
      <SourceList ids={entry.sources} sources={sources} />
      {sections && onOpen ? <CrossLinks entry={entry} sections={sections} skip={skip} onOpen={onOpen} /> : null}
      {myths.map((myth) => (
        <article key={myth.id} className="myth-card" data-entry={myth.id}>
          <h3 className="popup-title">{entryTitle(myth)}</h3>
          <p className="badge-row">
            <LabelBadge label={myth.label} />
          </p>
          <p className="popup-summary">{myth.text}</p>
          {myth.citation ? <p className="citation">{myth.citation}</p> : null}
          <ReadingLines entry={myth} sources={sources} />
          <FactList entry={myth} />
          <SourceList ids={myth.sources} sources={sources} />
          {sections && onOpen ? (
            <CrossLinks entry={myth} sections={sections} skip={new Set([...skip, myth.id])} onOpen={onOpen} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function CrossLinks({
  entry,
  sections,
  skip,
  onOpen,
}: {
  entry: Entry;
  sections: Record<string, Entry[]>;
  skip?: ReadonlySet<string>;
  onOpen: (entry: Entry) => void;
}) {
  const related = relatedEntries(entry, sections, skip);
  if (related.length === 0) return null;
  return (
    <div className="cross-links">
      {related.map((item) => (
        <button key={item.id} type="button" className="text-link" data-link={item.id} onClick={() => onOpen(item)}>
          {linkLabel(item)}
        </button>
      ))}
    </div>
  );
}

function linkLabel(entry: Entry): string {
  if (!entry.citation) return entryTitle(entry);
  return `${entryTitle(entry)} · ${entry.citation}`;
}

export function ReadingLines({ entry, sources }: { entry: Entry; sources: SourceRecord[] }) {
  const credits = entryCredits(entry, sources);
  if (!entry.primary_text && credits.length === 0) return null;
  return (
    <div className="reading-credit">
      {entry.primary_text && <p className="popup-place">{entry.primary_text}</p>}
      {credits.map((credit) => (
        <p key={credit} className="credit">
          {credit}
        </p>
      ))}
    </div>
  );
}

function FactList({ entry }: { entry: Entry }) {
  const facts: { label: string; value: string }[] = [];
  if (entry.year != null) facts.push({ label: 'Year', value: formatYear(entry.year) });
  if (entry.coords?.source_format) facts.push({ label: 'Coordinates', value: entry.coords.source_format });
  if (entry.unesco_year) facts.push({ label: 'UNESCO', value: String(entry.unesco_year) });
  if (entry.uncertainty) facts.push({ label: 'Uncertainty', value: entry.uncertainty });
  if (entry.sensitivity) facts.push({ label: 'Sensitivity', value: entry.sensitivity });
  if (entry.debate) facts.push({ label: 'Debate', value: entry.debate });
  if (facts.length === 0) return null;
  return (
    <dl className="popup-facts">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceList({ ids, sources }: { ids: string[]; sources: SourceRecord[] }) {
  return (
    <ul className="sources">
      {ids.map((id) => {
        const source = sources.find((item) => item.id === id);
        if (!source) return null;
        return (
          <li key={id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
            {' · '}
            {source.author_org}
          </li>
        );
      })}
    </ul>
  );
}

export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const place = () => placeSheet(node);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      clearSheetChrome();
    };
  }, []);
  return (
    <div ref={ref} className="event-sheet" role="dialog" aria-label={label}>
      <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

export function Dock({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="event-sheet is-dock" role="dialog" aria-label={label}>
      <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

export function DesktopPopup({
  map,
  lng,
  lat,
  onClose,
  children,
}: {
  map: MapLibreMap;
  lng: number;
  lat: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const popupRef = useRef<Popup | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = document.createElement('div');
    let suppress = false;
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '340px',
      className: 'event-popup',
      offset: 18,
      anchor: 'bottom',
      focusAfterOpen: false,
    })
      .setLngLat([lng, lat])
      .setDOMContent(element)
      .addTo(map);
    popup.on('close', () => {
      if (!suppress) onCloseRef.current();
    });
    popupRef.current = popup;
    setHost(element);
    return () => {
      suppress = true;
      popupRef.current = null;
      popup.remove();
      setHost(null);
    };
    // Anchored once per open. A new site uses a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    popupRef.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  const placePopup = () => {
    const element = popupRef.current?.getElement();
    if (!element) return;
    element.style.marginLeft = '0px';
    element.style.marginTop = '0px';
    const rect = element.getBoundingClientRect();
    const close = element.querySelector('.maplibregl-popup-close-button')?.getBoundingClientRect();
    const box = close
      ? {
          left: Math.min(rect.left, close.left),
          top: Math.min(rect.top, close.top),
          right: Math.max(rect.right, close.right),
          bottom: Math.max(rect.bottom, close.bottom),
        }
      : rect;
    const obstacles = ['.zoom', '.key-wrap', '.time', '.wordmark'].flatMap((selector) => {
      const node = document.querySelector(selector);
      if (!node) return [];
      const obstacle = node.getBoundingClientRect();
      if (obstacle.width < 2 || obstacle.height < 2) return [];
      return [{ left: obstacle.left, top: obstacle.top, right: obstacle.right, bottom: obstacle.bottom }];
    });
    const nudge = popupNudge(box, { width: window.innerWidth, height: window.innerHeight }, obstacles);
    element.style.marginLeft = `${nudge.dx}px`;
    element.style.marginTop = `${nudge.dy}px`;
  };

  useLayoutEffect(() => {
    placePopup();
  });

  useEffect(() => {
    placePopup();
    map.on('move', placePopup);
    map.on('moveend', placePopup);
    return () => {
      map.off('move', placePopup);
      map.off('moveend', placePopup);
    };
  }, [map, host]);

  if (!host) return null;
  return createPortal(children, host);
}

export function Panel({
  sheet,
  label,
  onClose,
  children,
}: {
  sheet: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (sheet) return <BottomSheet label={label} onClose={onClose}>{children}</BottomSheet>;
  return <Dock label={label} onClose={onClose}>{children}</Dock>;
}
