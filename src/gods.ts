export interface GodLink {
  entryId: string;
  /** Index relation. The entry text is the claim; this only groups it. */
  relation: 'born' | 'worshipped';
}

export interface God {
  id: string;
  name: string;
  links: GodLink[];
}

/**
 * Index over pack entries that already name the god.
 * Tests require each linked entry's text to contain the name.
 */
export const GODS: God[] = [
  {
    id: 'apollo',
    name: 'Apollo',
    links: [
      { entryId: 'm1', relation: 'born' },
      { entryId: 'm8', relation: 'born' },
      { entryId: 'm2', relation: 'worshipped' },
      { entryId: 'm9', relation: 'worshipped' },
      { entryId: 's26', relation: 'worshipped' },
    ],
  },
  {
    id: 'artemis',
    name: 'Artemis',
    links: [{ entryId: 'm1', relation: 'born' }],
  },
  {
    id: 'athena',
    name: 'Athena',
    links: [{ entryId: 's1', relation: 'worshipped' }],
  },
  {
    id: 'zeus',
    name: 'Zeus',
    links: [
      { entryId: 'm6', relation: 'born' },
      { entryId: 'm4', relation: 'worshipped' },
    ],
  },
  {
    id: 'aphrodite',
    name: 'Aphrodite',
    links: [
      { entryId: 'm5', relation: 'born' },
      { entryId: 'm22', relation: 'worshipped' },
      { entryId: 'm16', relation: 'worshipped' },
    ],
  },
  {
    id: 'asklepios',
    name: 'Asklepios',
    links: [{ entryId: 's5', relation: 'worshipped' }],
  },
];
