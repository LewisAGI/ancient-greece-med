import { GODS } from '../gods';
import { IconButton } from './IconButton';
import { GodMark, IconGods } from './icons';

interface GodsPopoutProps {
  open: boolean;
  selectedId: string | null;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

export function GodsPopout({ open, selectedId, onToggle, onSelect }: GodsPopoutProps) {
  return (
    <div className="tool-slot">
      <IconButton id="gods-button" label="Gods" expanded={open} onClick={onToggle}>
        <IconGods />
      </IconButton>
      <div id="gods-panel" className="popout gods-popout" hidden={!open}>
        {GODS.map((god) => (
          <IconButton key={god.id} label={god.name} pressed={god.id === selectedId} onClick={() => onSelect(god.id)}>
            <GodMark id={god.id} />
          </IconButton>
        ))}
      </div>
    </div>
  );
}
