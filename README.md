# Ancient Greece and the Mediterranean

An interactive globe of sanctuaries, poleis, and colonies from the Geometric period through Roman rule, with myths, people, a timeline, and public-domain readings pinned to the places that have a sourced point.

The map, the time bar, and the sheet layout follow [history-of-humanity-map](https://github.com/LewisAGI/history-of-humanity-map) and [wildlife-migration-atlas](https://github.com/LewisAGI/wildlife-migration-atlas).

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run build
npm run test:e2e
```

## Data

The v3 pack is in `data/content.json` and `data/sources.json`. The field rules are in [`data/SCHEMA.md`](data/SCHEMA.md).

A pin is drawn only when a published entry has coordinates. UNESCO listings that do not give a point stay in the knowledge list. Myths without their own point appear on the card of a mapped place they name. Alexandria, Emporion, and Massalia are flagged `include: false` and are left out of the built site until a page has been read.

Homeric and Hesiodic wording uses the public-domain translations of Samuel Butler and H.G. Evelyn-White, Project Gutenberg. Pausanias follows W.H.S. Jones, 1918. Each reading names the translator. Cards show the pack citation when one is present.

## Controls

The controls are icons. A name shows on hover, and on a long press. Places, gods, search, filters, and the index sit in pop-outs. The knowledge list, the timeline, people, readings, the glossary, comparisons, and the sources notice open as a panel, and as a bottom sheet on a phone. A story or a site has its own address (`#/story/…`, `#/site/…`). A timeline row sets the year and returns to the map only when that year sits on the slider. Arrow keys step one year. There is no year 0.

## Deploy

The HOHM bridge deploys this site to Cloudflare Pages project `ancient-greece-med`. `public/_headers` sends a content security policy, `X-Content-Type-Options: nosniff`, and a referrer policy.

```bash
npm ci && npm run build
```

The build writes `dist/`. See `bridge.json`. This repository does not contain Cloudflare credentials, and the CI workflow does not read them.

## Licence

Code: MIT, © LewisAGI. The globe and the time bar are adapted from the same author's MIT map projects. NASA Blue Marble imagery and Natural Earth land are public domain. The Gutenberg translations and the UNESCO listings keep their own terms; see `data/sources.json`.
