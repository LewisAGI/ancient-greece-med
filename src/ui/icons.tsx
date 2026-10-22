import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconPlus() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </Svg>
  );
}

export function IconMinus() {
  return (
    <Svg>
      <path d="M5 12h14" {...stroke} />
    </Svg>
  );
}

export function IconChevron({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6';
  return (
    <Svg>
      <path d={d} {...stroke} />
    </Svg>
  );
}

export function IconPlay() {
  return (
    <Svg>
      <path d="M8 5l12 7-12 7z" fill="currentColor" />
    </Svg>
  );
}

export function IconPause() {
  return (
    <Svg>
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
    </Svg>
  );
}

export function IconPlayback() {
  return (
    <Svg>
      <path d="M5 16c2.2-3.4 4.4-3.4 7 0s4.8 3.4 7 0" {...stroke} />
      <circle cx="12" cy="8" r="2.1" fill="currentColor" />
    </Svg>
  );
}

export function IconPlaces() {
  return (
    <Svg>
      <path d="M4 20h16M7 20V9l5-4 5 4v11" {...stroke} />
      <path d="M10 20v-5h4v5" {...stroke} />
    </Svg>
  );
}

export function IconGods() {
  return (
    <Svg>
      <path d="M12 3l1.6 4.7H18l-3.8 2.8 1.5 4.7L12 12.8 8.3 15.2l1.5-4.7L6 7.7h4.4z" {...stroke} />
    </Svg>
  );
}

export function IconKnowledge() {
  return (
    <Svg>
      <path d="M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19a2.4 2.4 0 0 0-2.2-1.5H5z" {...stroke} />
      <path d="M19 5.5h-6.2A2.8 2.8 0 0 0 10 8.3V19a2.4 2.4 0 0 1 2.2-1.5H19z" {...stroke} />
    </Svg>
  );
}

export function IconSources() {
  return (
    <Svg>
      <path d="M7 4h8l4 4v12H7z" {...stroke} />
      <path d="M15 4v4h4M9 13h6M9 17h4" {...stroke} />
    </Svg>
  );
}

export function IconMyth() {
  return (
    <Svg>
      <path d="M12 4c2.4 2.6 2.4 5 0 7.2C9.6 9 9.6 6.6 12 4z" {...stroke} />
      <path d="M8 14.5c2.2-1 3.4-.2 4 1.2.6-1.4 1.8-2.2 4-1.2-1.2 3.2-2.6 4.8-4 5.5-1.4-.7-2.8-2.3-4-5.5z" {...stroke} />
    </Svg>
  );
}

export function IconLoop() {
  return (
    <Svg>
      <path d="M7 8h8a4 4 0 0 1 0 8H9" {...stroke} />
      <path d="M10 5L7 8l3 3" {...stroke} />
    </Svg>
  );
}

export function IconSearch() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="M15.5 15.5L20 20" {...stroke} />
    </Svg>
  );
}

export function IconFilter() {
  return (
    <Svg>
      <path d="M4 6h16M7 12h10M10 18h4" {...stroke} />
    </Svg>
  );
}

export function IconTimeline() {
  return (
    <Svg>
      <path d="M6 5v14M6 8h8M6 12h12M6 16h6" {...stroke} />
    </Svg>
  );
}

export function IconIndex() {
  return (
    <Svg>
      <path d="M8 5h11M8 12h11M8 19h11" {...stroke} />
      <path d="M4 5h.01M4 12h.01M4 19h.01" {...stroke} />
    </Svg>
  );
}

export function IconPeople() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="3" {...stroke} />
      <path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" {...stroke} />
    </Svg>
  );
}

export function IconFurther() {
  return (
    <Svg>
      <path d="M6 5h9l3 3v11H6z" {...stroke} />
      <path d="M15 5v3h3" {...stroke} />
    </Svg>
  );
}

export function IconGlossary() {
  return (
    <Svg>
      <path d="M7 4h10v16H7z" {...stroke} />
      <path d="M10 8h4M10 12h4" {...stroke} />
    </Svg>
  );
}

export function IconCompare() {
  return (
    <Svg>
      <path d="M8 5v14M16 5v14M4 8h8M12 16h8" {...stroke} />
    </Svg>
  );
}

export function IconWest() {
  return (
    <Svg>
      <path d="M19 12H6M10 8l-4 4 4 4" {...stroke} />
    </Svg>
  );
}

export function IconEast() {
  return (
    <Svg>
      <path d="M5 12h13M14 8l4 4-4 4" {...stroke} />
    </Svg>
  );
}

export function IconSouth() {
  return (
    <Svg>
      <path d="M12 5v13M8 14l4 4 4-4" {...stroke} />
    </Svg>
  );
}

export function IconQuote() {
  return (
    <Svg>
      <path d="M8 16c0-3 1.2-5.5 3.5-7" {...stroke} />
      <path d="M5 16h5v-3.5C10 9 8.2 7.5 6 7.5" {...stroke} />
      <path d="M16 16c0-3 1.2-5.5 3.5-7" {...stroke} />
      <path d="M13 16h5v-3.5c0-3.5-1.8-5-4-5" {...stroke} />
    </Svg>
  );
}

export function GodMark({ id }: { id: string }) {
  if (id === 'artemis') {
    return (
      <Svg>
        <path d="M16 6.5A6.5 6.5 0 1 0 16 17" {...stroke} />
      </Svg>
    );
  }
  if (id === 'athena') {
    return (
      <Svg>
        <path d="M6 18l6-12 6 12" {...stroke} />
        <path d="M9 13h6" {...stroke} />
      </Svg>
    );
  }
  if (id === 'zeus') {
    return (
      <Svg>
        <path d="M13 3L6 13h6l-1 8 8-12h-6z" fill="currentColor" />
      </Svg>
    );
  }
  if (id === 'aphrodite') {
    return (
      <Svg>
        <path d="M5 14c2-6 5-8 7-8s5 2 7 8" {...stroke} />
        <path d="M8 14h8" {...stroke} />
      </Svg>
    );
  }
  if (id === 'asklepios') {
    return (
      <Svg>
        <path d="M12 4v16" {...stroke} />
        <path d="M12 8h4M12 12H8" {...stroke} />
      </Svg>
    );
  }
  return (
    <Svg>
      <circle cx="12" cy="12" r="3.2" {...stroke} />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" {...stroke} />
    </Svg>
  );
}

export function IconSpeed({ bars }: { bars: number }) {
  return (
    <Svg>
      {Array.from({ length: bars }, (_, index) => (
        <path key={index} d={`M${6 + index * 4} ${16 - index * 3}v${6 + index}`} {...stroke} />
      ))}
    </Svg>
  );
}
