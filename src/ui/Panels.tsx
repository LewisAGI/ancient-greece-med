import { useState } from 'react';
import type { Entry, SourceRecord } from '../data/schema';
import { glossaryEntries, KNOWLEDGE_SECTIONS, overlapYears, searchEntries } from '../explore';
import { GODS } from '../gods';
import { SOURCES_NOTICE } from '../notice';
import type { Pin } from '../pins';
import { readingEntries } from '../reading';
import type { Route } from '../routes';
import { entryTitle, sectionHeading } from '../titles';
import { formatYear, yearInside, type YearBounds } from '../years';
import type { GlobeController } from '../globe/createGlobe';
import { IconButton } from './IconButton';
import { IconCompare } from './icons';
import { withEra } from '../era';
import { LabelBadge, showsTradition } from './LabelBadge';
import { Uncertainty } from './Sheets';
import { DesktopPopup, EntryBody, Panel, ReadingLines, SourceList } from './Sheets';

type GlobeMap = NonNullable<GlobeController['map']>;

export function SheetHost({
  route,
  pins,
  sources,
  sections,
  periods,
  bounds,
  sheetMode,
  map,
  onClose,
  onOpen,
  onTimeline,
  onCompare,
}: {
  route: Route;
  pins: Pin[];
  sources: SourceRecord[];
  sections: Record<string, Entry[]>;
  periods: Entry[];
  bounds: YearBounds;
  sheetMode: boolean;
  map: GlobeMap | null;
  onClose: () => void;
  onOpen: (entry: Entry) => void;
  onTimeline: (entry: Entry) => void;
  onCompare: (slot: 'left' | 'right', id: string) => void;
}) {
  if (route.kind === 'map') return null;
  if (route.kind === 'site') {
    const pin = pins.find((item) => item.id === route.id);
    if (!pin) return null;
    const body = (
      <EntryBody entry={pin.entry} sources={sources} myths={pin.myths} sections={sections} onOpen={onOpen} />
    );
    if (sheetMode || !map) {
      return (
        <Panel sheet label={pin.title} onClose={onClose}>
          {body}
        </Panel>
      );
    }
    return (
      <DesktopPopup key={pin.id} map={map} lng={pin.lng} lat={pin.lat} onClose={onClose}>
        {body}
      </DesktopPopup>
    );
  }
  if (route.kind === 'story' || route.kind === 'entry') {
    const entry = findEntry(sections, route.id);
    if (!entry) return null;
    return (
      <Panel sheet={sheetMode} label={entryTitle(entry)} onClose={onClose}>
        <EntryBody entry={entry} sources={sources} sections={sections} onOpen={onOpen} />
      </Panel>
    );
  }
  if (route.kind === 'god') {
    const god = GODS.find((item) => item.id === route.id);
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
                  <LabelBadge label={entry.label} tradition={showsTradition(entry.id)} />
                </p>
                <p className="popup-summary">{withEra(entry.text)}</p>
                {entry.citation ? <p className="citation">{withEra(entry.citation)}</p> : null}
                <Uncertainty entry={entry} />
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
  if (route.kind === 'periods') {
    return (
      <Panel sheet={sheetMode} label="Period" onClose={onClose}>
        <EntryList entries={periods} sources={sources} onOpen={onOpen} />
      </Panel>
    );
  }
  if (route.kind === 'knowledge') {
    return (
      <Panel sheet={sheetMode} label="Knowledge" onClose={onClose}>
        <div className="sheet-copy">
          {KNOWLEDGE_SECTIONS.map((key) => (
            <section key={key} className="knowledge-section">
              <h2 className="popup-title">{sectionHeading(key)}</h2>
              <RowList entries={sections[key] ?? []} onOpen={onOpen} />
            </section>
          ))}
        </div>
      </Panel>
    );
  }
  if (route.kind === 'readings') {
    const readings = readingEntries(sections);
    return (
      <Panel sheet={sheetMode} label="Readings" onClose={onClose}>
        <div className="sheet-copy">
          {readings.map((entry) => (
            <article key={entry.id} className="myth-card" data-entry={entry.id}>
              <h2 className="popup-title">{withEra(entry.primary_text ?? entry.citation ?? entryTitle(entry))}</h2>
              <p className="badge-row">
                <LabelBadge label={entry.label} tradition={showsTradition(entry.id)} />
              </p>
              <p className="popup-summary">{withEra(entry.text)}</p>
              <Uncertainty entry={entry} />
              <ReadingLines entry={entry} sources={sources} />
              <SourceList ids={entry.sources} sources={sources} />
              <button type="button" className="text-link" onClick={() => onOpen(entry)}>
                {entryTitle(entry)}
              </button>
            </article>
          ))}
        </div>
      </Panel>
    );
  }
  if (route.kind === 'timeline') {
    return (
      <Panel sheet={sheetMode} label="Timeline" onClose={onClose}>
        <div className="sheet-copy">
          <RowList
            entries={sections.timeline ?? []}
            onOpen={onTimeline}
            labelFor={(entry) =>
              withEra(entry.year != null ? `${formatYear(entry.year)} · ${entryTitle(entry)}` : entryTitle(entry))
            }
            extra={(entry) => ({
              'data-year': entry.year != null ? String(entry.year) : '',
              'data-in-range': entry.year != null && yearInside(entry.year, bounds) ? 'true' : 'false',
            })}
          />
        </div>
      </Panel>
    );
  }
  if (route.kind === 'people') {
    return (
      <Panel sheet={sheetMode} label="People" onClose={onClose}>
        <div className="sheet-copy">
          <RowList entries={sections.people ?? []} onOpen={onOpen} />
        </div>
      </Panel>
    );
  }
  if (route.kind === 'further') {
    return (
      <Panel sheet={sheetMode} label="Further reading" onClose={onClose}>
        <div className="sheet-copy">
          <RowList entries={sections.further_reading ?? []} onOpen={onOpen} />
        </div>
      </Panel>
    );
  }
  if (route.kind === 'glossary') {
    return (
      <Panel sheet={sheetMode} label="Glossary" onClose={onClose}>
        <div className="sheet-copy">
          <RowList
            entries={glossaryEntries(sections)}
            onOpen={onOpen}
            labelFor={(entry) => (entry.citation ? `${entryTitle(entry)} · ${entry.citation}` : entryTitle(entry))}
          />
        </div>
      </Panel>
    );
  }
  if (route.kind === 'compare') {
    return (
      <Panel sheet={sheetMode} label="Compare" onClose={onClose}>
        <CompareBody
          leftId={route.left}
          rightId={route.right}
          sections={sections}
          sources={sources}
          onOpen={onOpen}
          onCompare={onCompare}
        />
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

function CompareBody({
  leftId,
  rightId,
  sections,
  sources,
  onOpen,
  onCompare,
}: {
  leftId?: string;
  rightId?: string;
  sections: Record<string, Entry[]>;
  sources: SourceRecord[];
  onOpen: (entry: Entry) => void;
  onCompare: (slot: 'left' | 'right', id: string) => void;
}) {
  const [slot, setSlot] = useState<'left' | 'right'>('left');
  const [query, setQuery] = useState('');
  const results = searchEntries(sections, query, 6);
  const left = leftId ? findEntry(sections, leftId) : undefined;
  const right = rightId ? findEntry(sections, rightId) : undefined;
  const overlap = left && right ? overlapYears(left, right) : null;
  return (
    <div className="sheet-copy" id="compare-panel">
      <div className="compare-tools">
        <IconButton label="First" pressed={slot === 'left'} onClick={() => setSlot('left')}>
          <IconCompare />
        </IconButton>
        <IconButton label="Second" pressed={slot === 'right'} onClick={() => setSlot('right')}>
          <IconCompare />
        </IconButton>
        <input
          id="compare-input"
          className="search-input"
          aria-label="Find an entry"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {results.length > 0 ? (
        <ul className="knowledge-list">
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="knowledge-row"
                data-entry={entry.id}
                onClick={() => onCompare(slot, entry.id)}
              >
                <span>{entryTitle(entry)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {overlap ? <p className="popup-place">{formatSpan(overlap.start, overlap.end)}</p> : null}
      <div className="compare-grid">
        {left ? <EntryBody entry={left} sources={sources} sections={sections} onOpen={onOpen} /> : null}
        {right ? <EntryBody entry={right} sources={sources} sections={sections} onOpen={onOpen} /> : null}
      </div>
    </div>
  );
}

function EntryList({
  entries,
  sources,
  onOpen,
}: {
  entries: Entry[];
  sources: SourceRecord[];
  onOpen: (entry: Entry) => void;
}) {
  return (
    <div className="sheet-copy">
      {entries.map((period) => (
        <article key={period.id} className="myth-card" data-entry={period.id}>
          <h2 className="popup-title">{entryTitle(period)}</h2>
          <p className="badge-row">
            <LabelBadge label={period.label} tradition={showsTradition(period.id)} />
          </p>
          <p className="popup-summary">{withEra(period.text)}</p>
          <SourceList ids={period.sources} sources={sources} />
          <button type="button" className="text-link" onClick={() => onOpen(period)}>
            {entryTitle(period)}
          </button>
        </article>
      ))}
    </div>
  );
}

function RowList({
  entries,
  onOpen,
  labelFor = entryTitle,
  extra,
}: {
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  labelFor?: (entry: Entry) => string;
  extra?: (entry: Entry) => Record<string, string>;
}) {
  return (
    <ul className="knowledge-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            className="knowledge-row"
            data-entry={entry.id}
            {...(extra ? extra(entry) : {})}
            onClick={() => onOpen(entry)}
          >
            <span>{labelFor(entry)}</span>
            <span className="badge-row">
              <LabelBadge label={entry.label} tradition={showsTradition(entry.id)} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatSpan(start: number, end: number): string {
  if (start === end) return formatYear(start);
  return `${formatYear(start)}–${formatYear(end)}`;
}

function findEntry(sections: Record<string, Entry[]>, id: string): Entry | undefined {
  return Object.values(sections)
    .flat()
    .find((entry) => entry.id === id);
}
