# Vancouver Island protected-areas demo

A dependency-free static demo using a locally vendored Leaflet build,
OpenStreetMap tiles, and locally stored official boundary snapshots.

The opening view groups 268 places into the seven Vancouver Island regional
districts, including 62 named marine islands of at least 500 hectares.
Selecting an authority reveals its populated municipalities and electoral
areas. Selecting one of those local areas reveals its places; selecting a place
switches from the label-free overview tiles to detailed OpenStreetMap.
Seen state is stored only in the browser.

## Run

From this directory:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173>. A local server is required because browsers
do not allow the page to fetch GeoJSON reliably when opened directly as a file.

## Included layers

- Provincial parks from BC TANTALIS
- National parks and national park reserves from NRCan/CLSS
- Candidate regional parks from OpenStreetMap, limited to polygon features whose
  names contain `Regional Park` and that overlap the official island layer
- Island polygons of at least 500 hectares from the BC Freshwater Atlas;
  named marine islands inside the hierarchy are selectable places
- Seven hierarchy zones clipped from BC's legally defined regional-district
  boundaries
- Populated municipality and electoral-area zones from BC's legally defined
  administrative boundaries

The OSM regional layer is provisional and incomplete. Source downloads,
licences, hashes, and preparation scripts are in `../data-research`.
