# Data inventory

Generated: 2026-08-14T08:49:42.7476525Z

## Polygon sources

- TANTALIS parks/protected areas: 930 features.
- TANTALIS conservancies: 169 features.
- National boundary source: 46 Canadian features, of which 7 matched British Columbia.

### Provincial designations

- PROVINCIAL PARK: 693
- ECOLOGICAL RESERVE: 148
- PROTECTED AREA: 87
- RECREATION AREA: 2

### British Columbia national parks/reserves

- GLACIER NATIONAL PARK OF CANADA
- GULF ISLANDS NATIONAL PARK RESERVE OF CANADA
- GWAII HAANAS NATIONAL PARK RESERVE OF CANADA
- KOOTENAY NATIONAL PARK OF CANADA
- MOUNT REVELSTOKE NATIONAL PARK OF CANADA
- PACIFIC RIM NATIONAL PARK RESERVE OF CANADA
- YOHO NATIONAL PARK OF CANADA

## Gazetteer

- Rows: 41061
- Detected feature-type column: Feature Type
- Columns: Official Name, Feature Type, Feature Type Code, Mapsheet, Latitude, Longitude, Datum, LatDD, LongDD
- Rich public map-layer subset: 5000 records.
- Valid BC coordinates: 41060
- Invalid coordinates retained but excluded from V1: 1

The complete CSV lacks a government-issued record ID. derived/bc-poi-candidates.csv
therefore uses a deterministic staging hash based on name, feature type code,
and coordinates. The hash is not an authoritative identifier.

### Candidate categories

- freshwater: 18388
- coast_island: 8242
- terrain: 7518
- populated_administrative: 1847
- reserve_military: 1565
- other: 1526
- park_reference: 1044
- ice_snow: 705
- recreation: 107
- heritage: 65
- vegetation: 54

### Most common feature types

- Creek (1): 10781
- Lake: 5934
- Mount: 2398
- Point: 2293
- Mountain: 1868
- Island: 1570
- Indian Reserve-Réserve indienne: 1553
- Peak (2): 1229
- Bay: 1113
- Community: 897
- River: 851
- Rock (1): 667
- Glacier: 654
- Provincial Park: 582
- Locality: 557
- Cove (2): 403
- Railway Point: 386
- Hill: 356
- Pass (2): 339
- Ridge (2): 335

## Initial conclusions

- The two TANTALIS feeds must be combined to cover provincial designations.
- The national service is Canada-wide, so retain the raw snapshot and use the derived BC-only GeoJSON.
- Gazetteer records are point POIs and should remain separate from park polygons.
- Raw source fields and IDs should be preserved when this moves into PostGIS.
