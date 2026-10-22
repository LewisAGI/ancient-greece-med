import { useState } from 'react';
import type { Entry } from '../data/schema';
import { searchEntries } from '../explore';
import { entryTitle } from '../titles';
import { IconButton } from './IconButton';
import { IconSearch } from './icons';

export function SearchPopout({
  open,
  sections,
  onToggle,
  onSelect,
}: {
  open: boolean;
  sections: Record<string, Entry[]>;
  onToggle: () => void;
  onSelect: (entry: Entry) => void;
}) {
  const [query, setQuery] = useState('');
  const results = searchEntries(sections, query, 8);
  return (
    <div className="tool-slot">
      <IconButton id="search-button" label="Search" expanded={open} onClick={onToggle}>
        <IconSearch />
      </IconButton>
      <div id="search-panel" className="popout search-popout" hidden={!open}>
        <input
          id="search-input"
          className="search-input"
          aria-label="Find"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {results.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="knowledge-row"
            data-entry={entry.id}
            onClick={() => onSelect(entry)}
          >
            <span>{entryTitle(entry)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
