import type { Route } from '../routes';
import { IconButton } from './IconButton';
import { IconCompare, IconFurther, IconGlossary, IconIndex, IconPeople } from './icons';

export function IndexPopout({
  open,
  route,
  onToggle,
  onOpen,
}: {
  open: boolean;
  route: Route;
  onToggle: () => void;
  onOpen: (route: Route) => void;
}) {
  return (
    <div className="tool-slot">
      <IconButton id="index-button" label="Index" expanded={open} onClick={onToggle}>
        <IconIndex />
      </IconButton>
      <div id="index-panel" className="popout" hidden={!open}>
        <IconButton label="People" pressed={route.kind === 'people'} onClick={() => onOpen({ kind: 'people' })}>
          <IconPeople />
        </IconButton>
        <IconButton label="Further reading" pressed={route.kind === 'further'} onClick={() => onOpen({ kind: 'further' })}>
          <IconFurther />
        </IconButton>
        <IconButton label="Glossary" pressed={route.kind === 'glossary'} onClick={() => onOpen({ kind: 'glossary' })}>
          <IconGlossary />
        </IconButton>
        <IconButton label="Compare" pressed={route.kind === 'compare'} onClick={() => onOpen({ kind: 'compare' })}>
          <IconCompare />
        </IconButton>
      </div>
    </div>
  );
}
