import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const researchRoot = path.dirname(scriptDir);
const repoRoot = path.dirname(researchRoot);
const derived = path.join(researchRoot, "derived");
const raw = path.join(researchRoot, "raw");
const demoData = path.join(repoRoot, "demo-map", "data");

const authorities = [
  { key: "acr", name: "Regional District of Alberni-Clayoquot", short: "Alberni-Clayoquot" },
  { key: "crd", name: "Capital Regional District", short: "Capital" },
  { key: "cvrd", name: "Comox Valley Regional District", short: "Comox Valley" },
  { key: "cow", name: "Cowichan Valley Regional District", short: "Cowichan Valley" },
  { key: "rdn", name: "Regional District of Nanaimo", short: "Nanaimo" },
  { key: "mwr", name: "Regional District of Mount Waddington", short: "Mount Waddington" },
  { key: "srd", name: "Strathcona Regional District", short: "Strathcona" }
];

const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const toMulti = geometry => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const fromMulti = coordinates => coordinates.length === 1
  ? { type: "Polygon", coordinates: coordinates[0] }
  : { type: "MultiPolygon", coordinates };

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(area / 2);
}

function multiArea(multi) {
  return multi.reduce((total, polygon) => total + ringArea(polygon[0]) - polygon.slice(1).reduce((holes, ring) => holes + ringArea(ring), 0), 0);
}

function centroidOfRing(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    twiceArea += cross;
    x += (ring[j][0] + ring[i][0]) * cross;
    y += (ring[j][1] + ring[i][1]) * cross;
  }
  return Math.abs(twiceArea) > 1e-12 ? [x / (3 * twiceArea), y / (3 * twiceArea)] : ring[0];
}

function parkName(feature, type) {
  if (type === "provincial") return feature.properties.PROTECTED_LANDS_NAME;
  if (type === "national") return feature.properties.adminAreaNameEng;
  if (type === "island") return feature.properties.GNIS_NAME_1 || feature.properties.GNIS_NAME_2 || feature.properties.GNIS_NAME_3;
  return feature.properties.name;
}

function parkId(feature, type) {
  if (type === "provincial") return `provincial:${feature.properties.ADMIN_AREA_SID}`;
  if (type === "national") return `national:${feature.properties.adminAreaId || feature.properties.OBJECTID || parkName(feature, type)}`;
  if (type === "island") return `island:${feature.properties.ISLAND_ID}`;
  return `regional:${feature.properties.osm_id}`;
}

function electoralShortName(name) {
  return name
    .replace(/^[A-Z]+\s+/, "")
    .replace(/^Electoral Area\s+/, "Area ")
    .replace(/\s+Electoral Area$/, "")
    .replace("Saltspring", "Salt Spring");
}

const regionalDistricts = read(path.join(raw, "bc-regional-districts.geojson"));
const municipalities = read(path.join(raw, "bc-municipalities.geojson"));
const electoralAreas = read(path.join(raw, "bc-electoral-areas.geojson"));
const mask = read(path.join(derived, "vancouver-island-region-draft.geojson")).features[0];
const islandSource = read(path.join(derived, "vancouver-island-islands.geojson"));
const largeIslands = islandSource.features.filter(feature =>
  Number(feature.properties.AREA_HA) >= 500 &&
  /Marine/.test(feature.properties.ISLAND_TYPE || "") &&
  parkName(feature, "island") &&
  parkName(feature, "island") !== "Vancouver Island"
);
const maskMulti = toMulti(mask.geometry);
const zoneFeatures = authorities.map(authority => {
  const source = regionalDistricts.features.find(feature => feature.properties.ADMIN_AREA_NAME === authority.name);
  if (!source) throw new Error(`Missing regional district: ${authority.name}`);
  const clipped = polygonClipping.intersection(toMulti(source.geometry), maskMulti);
  if (!clipped.length) throw new Error(`No clipped geometry for: ${authority.name}`);
  const largestPolygon = [...clipped].sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0];
  return {
    type: "Feature",
    properties: {
      authority_key: authority.key,
      authority_name: authority.name,
      short_name: authority.short,
      source_id: source.properties.LGL_ADMIN_AREA_ID,
      source: "BC Regional Districts - Legally Defined Administrative Areas",
      label_lon: centroidOfRing(largestPolygon[0])[0],
      label_lat: centroidOfRing(largestPolygon[0])[1]
    },
    geometry: fromMulti(clipped)
  };
});

const subregionFeatures = [];
for (const zone of zoneFeatures) {
  const authorityName = zone.properties.authority_name;
  const candidates = [
    ...municipalities.features
      .filter(feature => feature.properties.ADMIN_AREA_GROUP_NAME === authorityName)
      .map(feature => ({ feature, kind: "municipality" })),
    ...electoralAreas.features
      .filter(feature => feature.properties.ADMIN_AREA_GROUP_NAME === authorityName)
      .map(feature => ({ feature, kind: "electoral_area" }))
  ];
  for (const { feature, kind } of candidates) {
    const clipped = polygonClipping.intersection(toMulti(feature.geometry), toMulti(zone.geometry));
    if (!clipped.length || multiArea(clipped) <= 0) continue;
    const largestPolygon = [...clipped].sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0];
    const sourceId = feature.properties.LGL_ADMIN_AREA_ID;
    subregionFeatures.push({
      type: "Feature",
      properties: {
        subregion_key: `${kind === "municipality" ? "mun" : "ea"}:${sourceId}`,
        subregion_name: feature.properties.ADMIN_AREA_NAME,
        short_name: kind === "municipality"
          ? feature.properties.ADMIN_AREA_ABBREVIATION
          : electoralShortName(feature.properties.ADMIN_AREA_NAME),
        subregion_type: kind,
        authority_key: zone.properties.authority_key,
        authority_name: authorityName,
        source_id: sourceId,
        source: kind === "municipality"
          ? "BC Municipalities - Legally Defined Administrative Areas"
          : "BC Electoral Areas - Legally Defined Administrative Areas",
        label_lon: centroidOfRing(largestPolygon[0])[0],
        label_lat: centroidOfRing(largestPolygon[0])[1]
      },
      geometry: fromMulti(clipped)
    });
  }
}

const parkSources = [
  ["provincial", read(path.join(demoData, "provincial-parks.geojson")).features],
  ["national", read(path.join(demoData, "national-parks.geojson")).features],
  ["regional", read(path.join(demoData, "regional-parks-osm.geojson")).features],
  ["island", largeIslands]
];

const assignedParks = [];
const excludedParks = [];
for (const [parkType, features] of parkSources) {
  for (const feature of features) {
    const parkMulti = toMulti(feature.geometry);
    const matches = zoneFeatures.map(zone => {
      const intersection = polygonClipping.intersection(parkMulti, toMulti(zone.geometry));
      return { zone, area: intersection.length ? multiArea(intersection) : 0 };
    }).sort((a, b) => b.area - a.area);
    if (matches[0].area <= 0) {
      excludedParks.push({ type: parkType, name: parkName(feature, parkType) });
      continue;
    }
    const authority = matches[0].zone.properties;
    const subregionMatches = subregionFeatures
      .filter(subregion => subregion.properties.authority_key === authority.authority_key)
      .map(subregion => {
        const intersection = polygonClipping.intersection(parkMulti, toMulti(subregion.geometry));
        return { subregion, area: intersection.length ? multiArea(intersection) : 0 };
      })
      .sort((a, b) => b.area - a.area);
    const subregion = subregionMatches[0]?.subregion;
    if (!subregion) throw new Error(`No subregions found for ${authority.authority_name}`);
    assignedParks.push({
      type: "Feature",
      properties: {
        park_id: parkId(feature, parkType),
        name: parkName(feature, parkType),
        park_type: parkType,
        authority_key: authority.authority_key,
        authority_name: authority.authority_name,
        subregion_key: subregion.properties.subregion_key,
        subregion_name: subregion.properties.short_name,
        subregion_type: subregion.properties.subregion_type,
        area_ha: feature.properties.OFFICIAL_AREA_HA || feature.properties.AREA_HA || null,
        rank_area: multiArea(parkMulti),
        source: parkType === "provincial" ? "BC TANTALIS" : parkType === "national" ? "NRCan / CLSS" : parkType === "island" ? "BC Freshwater Atlas" : "OpenStreetMap",
        source_url: feature.properties.source_url || (parkType === "island" ? "https://catalogue.data.gov.bc.ca/dataset/4483aeea-df26-4b83-a565-934c769e74de" : null)
      },
      geometry: feature.geometry
    });
  }
}

for (const subregion of subregionFeatures) {
  const places = assignedParks.filter(feature => feature.properties.subregion_key === subregion.properties.subregion_key);
  subregion.properties.place_count = places.length;
  subregion.properties.provincial_count = places.filter(feature => feature.properties.park_type === "provincial").length;
  subregion.properties.national_count = places.filter(feature => feature.properties.park_type === "national").length;
  subregion.properties.regional_count = places.filter(feature => feature.properties.park_type === "regional").length;
  subregion.properties.island_count = places.filter(feature => feature.properties.park_type === "island").length;
}

const populatedSubregions = subregionFeatures.filter(feature => feature.properties.place_count > 0);

for (const zone of zoneFeatures) {
  const parks = assignedParks.filter(feature => feature.properties.authority_key === zone.properties.authority_key);
  zone.properties.park_count = parks.length;
  zone.properties.provincial_count = parks.filter(feature => feature.properties.park_type === "provincial").length;
  zone.properties.national_count = parks.filter(feature => feature.properties.park_type === "national").length;
  zone.properties.regional_count = parks.filter(feature => feature.properties.park_type === "regional").length;
  zone.properties.island_count = parks.filter(feature => feature.properties.park_type === "island").length;
}

fs.writeFileSync(path.join(demoData, "regional-authorities.geojson"), JSON.stringify({ type: "FeatureCollection", name: "vancouver-island-regional-authorities", features: zoneFeatures }) + "\n");
fs.writeFileSync(path.join(demoData, "local-subregions.geojson"), JSON.stringify({ type: "FeatureCollection", name: "vancouver-island-local-subregions", features: populatedSubregions }) + "\n");
fs.writeFileSync(path.join(demoData, "parks-by-authority.geojson"), JSON.stringify({ type: "FeatureCollection", name: "vancouver-island-parks-by-authority", features: assignedParks }) + "\n");
fs.writeFileSync(path.join(derived, "hierarchy-summary.json"), JSON.stringify({
  authorities: zoneFeatures.map(zone => zone.properties),
  subregions: populatedSubregions.map(subregion => subregion.properties),
  includedParkCount: assignedParks.length,
  excludedParkCount: excludedParks.length,
  excludedParks
}, null, 2) + "\n");

console.log(JSON.stringify({ authorities: zoneFeatures.map(zone => ({ name: zone.properties.short_name, parks: zone.properties.park_count })), included: assignedParks.length, excluded: excludedParks.length }, null, 2));
