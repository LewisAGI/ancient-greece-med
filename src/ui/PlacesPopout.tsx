import type { Pin } from '../pins';
import { IconButton } from './IconButton';
import { IconMyth, IconPlaces } from './icons';

interface PlacesPopoutProps {
  pins: Pin[];
  open: boolean;
  mythOnly: boolean;
  onToggle: () => void;
  onToggleMyth: () => void;
  onSelect: (id: string) => void;
}

export function PlacesPopout({ pins, open, mythOnly, onToggle, onToggleMyth, onSelect }: PlacesPopoutProps) {
  const shown = mythOnly ? pins.filter((pin) => pin.myths.length > 0) : pins;
  return (
    <div className="tool-slot">
      <IconButton id="places-button" label="Places" expanded={open} onClick={onToggle}>
        <IconPlaces />
      </IconButton>
      <div id="places-panel" className="popout places-popout" hidden={!open}>
        <IconButton label="Myth sites" pressed={mythOnly} onClick={onToggleMyth}>
          <IconMyth />
        </IconButton>
        {shown.map((pin) => (
          <button
            key={pin.id}
            type="button"
            className="icon-button place-option"
            data-tip={pin.title}
            title={pin.title}
            aria-label={pin.title}
            data-place={pin.id}
            onClick={() => onSelect(pin.id)}
          >
            <span className="swatch" style={{ background: pin.myths.length > 0 ? '#e6c36a' : '#d7c4a3' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
