import type { Pin } from '../pins';
import { IconButton } from './IconButton';
import { IconPlaces } from './icons';

interface PlacesPopoutProps {
  pins: Pin[];
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

export function PlacesPopout({ pins, open, onToggle, onSelect }: PlacesPopoutProps) {
  return (
    <div className="tool-slot">
      <IconButton id="places-button" label="Places" expanded={open} onClick={onToggle}>
        <IconPlaces />
      </IconButton>
      <div id="places-panel" className="popout places-popout" hidden={!open}>
        {pins.map((pin) => (
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
