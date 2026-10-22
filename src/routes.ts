export type Route =
  | { kind: 'map' }
  | { kind: 'timeline' }
  | { kind: 'people' }
  | { kind: 'further' }
  | { kind: 'glossary' }
  | { kind: 'readings' }
  | { kind: 'knowledge' }
  | { kind: 'sources' }
  | { kind: 'periods' }
  | { kind: 'compare'; left?: string; right?: string }
  | { kind: 'site'; id: string }
  | { kind: 'story'; id: string }
  | { kind: 'entry'; id: string }
  | { kind: 'god'; id: string };

const ID = /^[a-z][a-z0-9]*$/;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!path) return { kind: 'map' };
  const parts = path.split('/').filter(Boolean);
  const head = parts[0];
  if (head === 'timeline') return { kind: 'timeline' };
  if (head === 'people') return { kind: 'people' };
  if (head === 'further') return { kind: 'further' };
  if (head === 'glossary') return { kind: 'glossary' };
  if (head === 'readings') return { kind: 'readings' };
  if (head === 'knowledge') return { kind: 'knowledge' };
  if (head === 'sources') return { kind: 'sources' };
  if (head === 'periods') return { kind: 'periods' };
  if (head === 'compare') {
    const left = parts[1] && ID.test(parts[1]) ? parts[1] : undefined;
    const right = parts[2] && ID.test(parts[2]) ? parts[2] : undefined;
    return { kind: 'compare', left, right };
  }
  if (head === 'site' && parts[1] && ID.test(parts[1])) return { kind: 'site', id: parts[1] };
  if (head === 'story' && parts[1] && ID.test(parts[1])) return { kind: 'story', id: parts[1] };
  if (head === 'entry' && parts[1] && ID.test(parts[1])) return { kind: 'entry', id: parts[1] };
  if (head === 'god' && parts[1] && ID.test(parts[1])) return { kind: 'god', id: parts[1] };
  return { kind: 'map' };
}

export function formatHash(route: Route): string {
  switch (route.kind) {
    case 'map':
      return '';
    case 'timeline':
    case 'people':
    case 'further':
    case 'glossary':
    case 'readings':
    case 'knowledge':
    case 'sources':
    case 'periods':
      return `#/${route.kind}`;
    case 'compare': {
      const tail = [route.left, route.right].filter(Boolean).join('/');
      return tail ? `#/compare/${tail}` : '#/compare';
    }
    case 'site':
    case 'story':
    case 'entry':
    case 'god':
      return `#/${route.kind}/${route.id}`;
    default:
      return '';
  }
}

export function writeHash(route: Route): void {
  const hash = formatHash(route);
  const next = `${window.location.pathname}${window.location.search}${hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === next) return;
  window.history.pushState(null, '', next);
}

export function sameRoute(a: Route, b: Route): boolean {
  return formatHash(a) === formatHash(b);
}
