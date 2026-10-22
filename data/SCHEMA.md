# Data schema

Content pack v2 (22 October 2026): 6 periods, 22 myths, 28 sites, 36 sources. The application reads `content.json` and `sources.json`.

Years are historical. `-480` is 480 BCE, `330` is 330 CE, and there is no year 0.

## `sources.json`

An array of source records.

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | yes, unique |
| `title` | string | yes |
| `author_org` | string | yes |
| `url` | `http` or `https` URL | yes |
| `date_accessed` | `YYYY-MM-DD` | yes |
| `quality` | string | yes |

Gutenberg records name the translator in `title` (`tr. …`) and Project Gutenberg in `author_org`. The reading panel repeats that credit.

## `content.json`

```json
{
  "meta": { "pack": "ancient-greece-med", "version": 1, "created": "YYYY-MM-DD", "note": "optional" },
  "periods": [],
  "myths_places": [],
  "sites": []
}
```

`meta` is required. Every other key is a section: an array of entries. `meta.version` in this pack is still 1; the v2 expansion is the added entries.

### Entry

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | yes, unique across sections |
| `text` | string | yes |
| `sources` | string[] | yes, at least one id, each id in `sources.json` |
| `label` | `evidence`, `inference`, or `abstract-only` | yes |
| `coords` | `{ lat, lon, source_format? }` or `null` | no |
| `uncertainty` | string | no |
| `sensitivity` | string | no |
| `debate` | string | no |
| `start`, `end` | historical years | no, used by periods |
| `place` | string | no, used by myths. Several names may be separated with `;` |
| `primary_text` | string | no, work and section of a public-domain translation |
| `country_region` | string or `null` | no |
| `unesco_year` | integer or `null` | no |

`coords.lat` is -90..90 and `coords.lon` is -180..180. `source_format` is the DMS string the coordinate was converted from. `null` means the pack has no sourced point.

`start` and `end` are inclusive integers, neither may be 0, and `start` must be less than or equal to `end`. A span may cross from BCE into CE.

### What is mapped

A pin is drawn only for an entry with a finite `coords` object. That includes UNESCO sites outside Greece when the listing gives a point (Troy, Agrigento, Leptis Magna, Cyrene, Byblos, Butrint, Hierapolis, and others). Entries with `coords: null`, including Paestum, Syracuse, Carthage, and the serial sites, stay in the knowledge list and are not pinned.

A myth with no coordinates is shown on the card of a mapped entry whose text names a `place` key (whole word). It is not given an invented point. Myths whose places have no sourced site (Ithaca, Corinth, Paphos, and others) stay in the list.

### Labels

The badge is the entry’s `label`.

- `evidence` — stated in the cited source
- `inference` — not a direct statement of the source
- `abstract-only` — the cited item was read at abstract or summary level

The v2 file uses `evidence` throughout. The other two badges are part of the schema for later entries.
