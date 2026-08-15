# BC parks data research

This folder is a reproducible staging area for exploring authoritative park
boundaries and point-of-interest data before loading it into PostGIS.

## V1 sources

| File | Dataset | Role |
| --- | --- | --- |
| `raw/bc-parks-protected-areas.geojson` | BC Parks, Ecological Reserves, and Protected Areas | Provincial polygons except conservancies |
| `raw/canada-national-parks.geojson` | National Parks and National Park Reserves legislative boundaries | Federal source snapshot; filtered to BC during analysis |
| `derived/osm-regional-parks.geojson` | OpenStreetMap | Provisional polygons explicitly named Regional Park |
| `derived/vancouver-island-islands.geojson` | BC Freshwater Atlas Islands | Official island reference polygons of at least one hectare; the demo promotes named marine islands at least 500 hectares to selectable places |
| `raw/bc-regional-districts.geojson` | BC Regional Districts - Legally Defined Administrative Areas | Seven-authority hierarchy source |
| `raw/bc-municipalities.geojson` | BC Municipalities - Legally Defined Administrative Areas | Municipality hierarchy source |
| `raw/bc-electoral-areas.geojson` | BC Electoral Areas - Legally Defined Administrative Areas | Unincorporated-area hierarchy source |
| `raw/bc-gazetteer.csv` | BC Gazetteer | Official named POI points |
| `raw/bc-geographical-names.geojson` | BC Geographical Names map layer | Rich 5,000-record cartographic subset with stable IDs and categories |
| `raw/bc-gazetteer-feature-types.pdf` | Gazetteer feature-type definitions | Data dictionary |

The ArcGIS layer schemas are saved beside the data as `*.schema.json`.
`derived/bc-poi-candidates.csv` contains the complete 41,061-row Gazetteer,
classified into broad POI categories with deterministic staging keys.

## Reproduce

From this directory in PowerShell:

```powershell
./scripts/fetch-data.ps1
./scripts/analyze-data.ps1
./scripts/fetch-island-polygons.ps1
node ./scripts/fetch-osm-regional-parks.mjs
node ./scripts/prepare-demo-map-data.mjs
node ./scripts/prepare-hierarchical-map-data.mjs
```

The fetch script writes downloads atomically and records byte sizes and
SHA-256 checksums in `raw/download-manifest.json`. The analysis script writes
machine-readable summaries to `derived/` and a concise report to
`DATA-INVENTORY.md`.

## Licensing and attribution

- Provincial data and the Gazetteer: Open Government Licence - British
  Columbia. Required acknowledgement: `Contains information licensed under
  the Open Government Licence - British Columbia.`
- National park boundaries: Open Government Licence - Canada. Required
  acknowledgement: `Contains information licensed under the Open Government
  Licence - Canada.`
- Regional-park candidates: © OpenStreetMap contributors, available under the
  Open Data Commons Open Database License. This layer is not authoritative.

The application should expose a Data Sources screen containing the dataset
title, publisher, source URL, licence URL, retrieval date, and snapshot/hash.

## Important modelling notes

- Preserve the supplied polygon geometry. Do not replace park polygons with
  Gazetteer points.
- `ADMIN_AREA_SID` is the stable provincial source identifier shared by the
  two TANTALIS layers.
- Keep `jurisdiction` separate from `designation`: all TANTALIS records are
  provincial, while their designations include provincial park, ecological
  reserve, protected area, recreation area, and conservancy.
- Gazetteer coordinates are representative points, not boundaries.
- The complete Gazetteer CSV does not contain a durable record ID. The derived
  staging key is a hash of name, type code, and coordinates; it must not be
  mistaken for a government-issued ID. The richer public map layer has
  `FEATURE_UUID`, but currently exposes only 5,000 cartographic records.
- Keep raw source attributes and provenance even after creating a normalized
  PostGIS model.
