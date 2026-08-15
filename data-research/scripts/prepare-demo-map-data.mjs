import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const researchRoot = path.dirname(scriptDir);
const repoRoot = path.dirname(researchRoot);
const derived = path.join(researchRoot, "derived");
const demoData = path.join(repoRoot, "demo-map", "data");
fs.mkdirSync(demoData, { recursive: true });

const read = name => JSON.parse(fs.readFileSync(path.join(derived, name), "utf8").replace(/^\uFEFF/, ""));
const write = (name, collection) => fs.writeFileSync(path.join(demoData, name), JSON.stringify(collection) + "\n");

const provincialSource = read("vancouver-island-provincial-protected.geojson");
const nationalSource = read("vancouver-island-national-parks.geojson");
const regionalSource = read("osm-regional-parks.geojson");
const islandSource = read("vancouver-island-islands.geojson");

const provincial = provincialSource.features.filter(feature => feature.properties.PROTECTED_LANDS_DESIGNATION === "PROVINCIAL PARK");
const regional = regionalSource.features.filter(feature => !/Metro Vancouver/i.test(feature.properties.operator || ""));

function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  if (x1 === x2 && y1 === y2) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
  return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
}

function simplifyOpen(points, tolerance) {
  if (points.length <= 2) return points;
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points.at(-1));
    if (distance > farthest) { farthest = distance; index = i; }
  }
  if (farthest <= tolerance) return [points[0], points.at(-1)];
  return [...simplifyOpen(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplifyOpen(points.slice(index), tolerance)];
}

function simplifyRing(ring, tolerance = 0.00012) {
  if (ring.length <= 5) return ring.map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]);
  const open = ring.slice(0, -1);
  const split = Math.floor(open.length / 2);
  const simplified = [
    ...simplifyOpen(open.slice(0, split + 1), tolerance).slice(0, -1),
    ...simplifyOpen([...open.slice(split), open[0]], tolerance)
  ].map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]);
  if (simplified.length < 4) return ring.slice(0, 4);
  simplified[simplified.length - 1] = simplified[0];
  return simplified;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: geometry.coordinates.map(ring => simplifyRing(ring)) };
  return { type: "MultiPolygon", coordinates: geometry.coordinates.map(polygon => polygon.map(ring => simplifyRing(ring))) };
}

const islands = islandSource.features.filter(feature => Number(feature.properties.AREA_HA) >= 500).map(feature => ({
  type: "Feature",
  properties: {
    island_id: feature.properties.ISLAND_ID,
    name: feature.properties.GNIS_NAME_1 || feature.properties.GNIS_NAME_2 || feature.properties.GNIS_NAME_3 || null,
    area_ha: feature.properties.AREA_HA,
    source: "BC Freshwater Atlas"
  },
  geometry: simplifyGeometry(feature.geometry)
}));

write("provincial-parks.geojson", { type: "FeatureCollection", name: "provincial-parks-working-region", features: provincial });
write("national-parks.geojson", { type: "FeatureCollection", name: "national-parks-working-region", features: nationalSource.features });
write("regional-parks-osm.geojson", { ...regionalSource, name: "regional-parks-osm-working-region", features: regional });
write("island-outlines.geojson", { type: "FeatureCollection", name: "fwa-island-outlines-working-region", features: islands });

console.log(JSON.stringify({ provincial: provincial.length, national: nationalSource.features.length, regional: regional.length, islands: islands.length }, null, 2));
