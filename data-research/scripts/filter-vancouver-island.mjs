import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const raw = path.join(root, "raw");
const derived = path.join(root, "derived");

// Preliminary tourism-region mask. The eastern edge follows the island side of
// the straits while including the Gulf and Discovery island groups. Replace this
// with a union of selected FWA island polygons after the product inclusion policy
// is finalized.
const regionRing = [
  [-129.15, 51.05], [-126.75, 51.15], [-125.95, 50.82],
  [-124.58, 50.48], [-124.40, 49.92], [-123.55, 49.30],
  [-122.88, 48.72], [-122.92, 48.36], [-123.30, 48.18],
  [-124.25, 48.22], [-125.35, 48.60], [-126.55, 49.20],
  [-127.65, 49.95], [-129.15, 51.05]
];

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function vertices(geometry) {
  if (!geometry) return [];
  const out = [];
  const walk = value => {
    if (Array.isArray(value) && value.length >= 2 &&
        typeof value[0] === "number" && typeof value[1] === "number") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
  };
  walk(geometry.coordinates);
  return out;
}

function featureTouchesRegion(feature) {
  const points = vertices(feature.geometry);
  if (points.some(point => pointInRing(point, regionRing))) return true;
  if (!points.length) return false;
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  return pointInRing([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], regionRing);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeCollection(file, name, features) {
  fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", name, features }));
}

const provincial = readJson(path.join(raw, "bc-parks-protected-areas.geojson"));
const conservancies = readJson(path.join(raw, "bc-conservancies.geojson"));
const national = readJson(path.join(derived, "bc-national-parks.geojson"));

const provincialVi = provincial.features.filter(featureTouchesRegion);
const conservanciesVi = conservancies.features.filter(featureTouchesRegion);
const nationalVi = national.features.filter(featureTouchesRegion);

writeCollection(path.join(derived, "vancouver-island-provincial-protected.geojson"), "vancouver-island-provincial-protected-draft", provincialVi);
writeCollection(path.join(derived, "vancouver-island-conservancies.geojson"), "vancouver-island-conservancies-draft", conservanciesVi);
writeCollection(path.join(derived, "vancouver-island-national-parks.geojson"), "vancouver-island-national-parks-draft", nationalVi);
writeCollection(path.join(derived, "vancouver-island-region-draft.geojson"), "vancouver-island-tourism-region-draft", [{
  type: "Feature",
  properties: { status: "draft", method: "hand-drawn tourism-region mask" },
  geometry: { type: "Polygon", coordinates: [regionRing] }
}]);

const poiCsv = fs.readFileSync(path.join(derived, "bc-poi-candidates.csv"), "utf8").replace(/^\uFEFF/, "");
const lines = poiCsv.split(/\r?\n/).filter(Boolean);
const parseCsv = line => {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
};
const header = parseCsv(lines[0]);
const latIndex = header.indexOf("latitude");
const lonIndex = header.indexOf("longitude");
const includeIndex = header.indexOf("include_v1");
const categoryIndex = header.indexOf("poi_category");
const poiRows = lines.slice(1).map(line => ({ line, values: parseCsv(line) }));
const viPoi = poiRows.filter(({ values }) => pointInRing([Number(values[lonIndex]), Number(values[latIndex])], regionRing));
fs.writeFileSync(path.join(derived, "vancouver-island-poi-candidates.csv"), [lines[0], ...viPoi.map(row => row.line)].join("\n") + "\n");

const counts = values => Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(item => item === value).length]));
const summary = {
  warning: "Preliminary geometric mask; validate eastern and northern edge cases against the final FWA island allowlist.",
  provincialProtectedTotal: provincialVi.length,
  provincialByDesignation: counts(provincialVi.map(feature => feature.properties.PROTECTED_LANDS_DESIGNATION)),
  conservancies: conservanciesVi.length,
  national: nationalVi.length,
  nationalNames: nationalVi.map(feature => feature.properties.adminAreaNameEng).sort(),
  poiTotal: viPoi.length,
  poiV1Candidates: viPoi.filter(row => row.values[includeIndex] === "True").length,
  poiByCategory: counts(viPoi.map(row => row.values[categoryIndex]))
};
fs.writeFileSync(path.join(derived, "vancouver-island-summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
