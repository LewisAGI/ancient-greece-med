# Data schema

Content pack v3 (22 October 2026). The application reads `content.json` and `sources.json`. Entries with `include: false` stay in the source file and are removed before the site bundle is built.

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
  "sites": [],
  "people": [],
  "timeline": [],
  "further_reading": []
}
```

`meta` is required. Every other key is a section: an array of entries. `meta.version` in this pack is still 1; the v3 expansion is the added entries and fields.

### Entry

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | yes, unique across sections |
| `text` | string | yes |
| `sources` | string[] | yes, at least one id, each id in `sources.json` |
| `label` | qualified label | yes |
| `coords` | `{ lat, lon, source_format? }` or `null` | no |
| `uncertainty` | string | no |
| `sensitivity` | string | no |
| `debate` | string | no |
| `start`, `end` | historical years | no, used by periods |
| `year` | historical year | no, used by timeline rows |
| `place` | string | no, used by myths. Several names may be separated with `;` |
| `primary_text` | string | no, work and section of a public-domain translation |
| `citation` | string | no, line or section reference shown on the card |
| `country_region` | string or `null` | no |
| `unesco_year` | integer or `null` | no |
| `include` | boolean | no, `false` omits the entry from the published catalog |

`coords.lat` is -90..90 and `coords.lon` is -180..180. `source_format` is the DMS string the coordinate was converted from. `null` means the pack has no sourced point.

`start`, `end`, and `year` are integers, none may be 0, and `start` must be less than or equal to `end`. A span may cross from BCE into CE.

### What is published

`include: false` marks an entry that rests on a search summary. The flag stays in `data/content.json`. The Vite build and the catalog loader both drop those entries, so their text is not in the site bundle. Alexandria (`s33`), Emporion (`s37`), Massalia (`s38`), and the matching timeline rows (`tl7`, `tl8`, `tl16`) are the flagged rows. Abu Mena, Lugo, Naples, and the Princeton Encyclopedia further-reading pointer stay.

### What is mapped

A pin is drawn only for a published entry with a finite `coords` object. That includes UNESCO sites outside Greece when the listing gives a point (Troy, Abu Mena, Lugo, and others). Entries with `coords: null`, including Paestum, Syracuse, Carthage, and the serial sites, stay in the knowledge list and are not pinned.

A myth with no coordinates is shown on the card of a mapped entry whose text names a `place` key (whole word). A trailing `area`, as in `Olympia area`, matches the place name. It is not given an invented point. Myths whose places have no sourced site stay in the list.

### Labels

The stored label may be `evidence`, `inference`, `abstract-only`, or a short qualified phrase. The badges on screen stay short:

- `evidence` — stated in the cited source
- `inference` — not a direct statement of the source
- `abstract` — the cited item was read at abstract or summary level, including a search summary

A label that names both evidence and inference shows both badges.
