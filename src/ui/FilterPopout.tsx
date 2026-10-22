import type { PlaceFilter } from '../explore';
import { IconButton } from './IconButton';
import { IconEast, IconFilter, IconMyth, IconPlaces, IconQuote, IconSouth, IconWest } from './icons';

const OPTIONS: { id: PlaceFilter; label: string; icon: 'all' | 'myth' | 'reading' | 'west' | 'east' | 'south' }[] = [
  { id: 'all', label: 'All places', icon: 'all' },
  { id: 'myth', label: 'Myth sites', icon: 'myth' },
  { id: 'reading', label: 'Cited', icon: 'reading' },
  { id: 'west', label: 'West', icon: 'west' },
  { id: 'east', label: 'East', icon: 'east' },
  { id: 'south', label: 'South', icon: 'south' },
];

export function FilterPopout({
  open,
  filter,
  onToggle,
  onSelect,
}: {
  open: boolean;
  filter: PlaceFilter;
  onToggle: () => void;
  onSelect: (filter: PlaceFilter) => void;
}) {
  return (
    <div className="tool-slot">
      <IconButton id="filter-button" label="Filter" expanded={open} pressed={filter !== 'all'} onClick={onToggle}>
        <IconFilter />
      </IconButton>
      <div id="filter-panel" className="popout" hidden={!open}>
        {OPTIONS.map((option) => (
          <IconButton
            key={option.id}
            label={option.label}
            pressed={filter === option.id}
            onClick={() => onSelect(option.id)}
          >
            <FilterIcon name={option.icon} />
          </IconButton>
        ))}
      </div>
    </div>
  );
}

function FilterIcon({ name }: { name: (typeof OPTIONS)[number]['icon'] }) {
  if (name === 'myth') return <IconMyth />;
  if (name === 'reading') return <IconQuote />;
  if (name === 'west') return <IconWest />;
  if (name === 'east') return <IconEast />;
  if (name === 'south') return <IconSouth />;
  return <IconPlaces />;
}
