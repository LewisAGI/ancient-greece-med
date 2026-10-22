# Ancient Greece and the Mediterranean

An interactive globe of sanctuaries, poleis, and colonies from the Geometric period through Roman rule, with myths and public-domain readings pinned to the places that have a sourced point.

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

The v2 pack is in `data/content.json` and `data/sources.json`. The field rules are in [`data/SCHEMA.md`](data/SCHEMA.md).

A pin is drawn only when an entry has coordinates. UNESCO listings that do not give a point, including several sites outside Greece, stay in the knowledge list. Myths without their own point appear on the card of a mapped place they name.

Homeric and Hesiodic wording uses the public-domain translations of Samuel Butler and H.G. Evelyn-White, Project Gutenberg. Pausanias Book 2 follows W.H.S. Jones, 1918. Each reading names the translator.

The pack does not yet include Alexandria, Iberia, or Massalia, and it has no quiz. Placeholder rows for Troy, Syracuse, and Carthage were removed once those sites arrived in the pack.

## Controls

The controls are icons. A name shows on hover, and on a long press. Places, gods, and playback sit in pop-outs. The knowledge list, the readings, and the sources notice open as a panel, and as a bottom sheet on a phone. Arrow keys step one year. There is no year 0.

## Deploy

The HOHM bridge deploys this site to Cloudflare Pages project `ancient-greece-med`.

```bash
npm ci && npm run build
```

The build writes `dist/`. See `bridge.json`. This repository does not contain Cloudflare credentials, and the CI workflow does not read them.

## Licence

Code: MIT, © LewisAGI. The globe and the time bar are adapted from the same author's MIT map projects. NASA Blue Marble imagery and Natural Earth land are public domain. The Gutenberg translations and the UNESCO listings keep their own terms; see `data/sources.json`.
