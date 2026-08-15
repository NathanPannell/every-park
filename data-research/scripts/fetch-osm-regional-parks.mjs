import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const output = path.join(root, "derived", "osm-regional-parks.geojson");
const islandsFile = path.join(root, "derived", "vancouver-island-islands.geojson");
const rawOutput = path.join(root, "raw", "osm-regional-parks-overpass.json");
if (!fs.existsSync(rawOutput)) throw new Error("Run the lightweight Overpass discovery query before hydrating regional-park relations.");
const data = JSON.parse(fs.readFileSync(rawOutput, "utf8"));
const query = "OSM name contains 'Regional Park'; relation geometry hydrated through OSM API /relation/{id}/full.json";

const pointKey = point => `${point[0]},${point[1]}`;
const samePoint = (a, b) => pointKey(a) === pointKey(b);
const coordinates = geometry => (geometry || []).map(point => [point.lon, point.lat]);

function stitchRings(segments) {
  const pending = segments.filter(segment => segment.length > 1).map(segment => [...segment]);
  const rings = [];
  while (pending.length) {
    const ring = pending.shift();
    let changed = true;
    while (!samePoint(ring[0], ring.at(-1)) && changed) {
      changed = false;
      for (let i = 0; i < pending.length; i++) {
        const segment = pending[i];
        if (samePoint(ring.at(-1), segment[0])) ring.push(...segment.slice(1));
        else if (samePoint(ring.at(-1), segment.at(-1))) ring.push(...segment.slice(0, -1).reverse());
        else if (samePoint(ring[0], segment.at(-1))) ring.unshift(...segment.slice(0, -1));
        else if (samePoint(ring[0], segment[0])) ring.unshift(...segment.slice(1).reverse());
        else continue;
        pending.splice(i, 1);
        changed = true;
        break;
      }
    }
    if (ring.length >= 4 && samePoint(ring[0], ring.at(-1))) rings.push(ring);
  }
  return rings;
}

function geometryFor(element) {
  if (element.type === "way") {
    const ring = coordinates(element.geometry);
    return ring.length >= 4 && samePoint(ring[0], ring.at(-1)) ? { type: "Polygon", coordinates: [ring] } : null;
  }
  const outerSegments = element.members?.filter(member => member.type === "way" && member.role !== "inner" && member.geometry).map(member => coordinates(member.geometry)) || [];
  const outerRings = stitchRings(outerSegments);
  if (!outerRings.length) return null;
  return outerRings.length === 1 ? { type: "Polygon", coordinates: [outerRings[0]] } : { type: "MultiPolygon", coordinates: outerRings.map(ring => [ring]) };
}

async function hydrateRelation(relation) {
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/relation/${relation.id}/full.json`, {
    headers: { "user-agent": "EveryPark-Vancouver-Island-Research/0.1 (local map prototype)" }
  });
  if (!response.ok) throw new Error(`OSM relation ${relation.id} returned ${response.status}`);
  const full = await response.json();
  const nodes = new Map(full.elements.filter(element => element.type === "node").map(node => [node.id, node]));
  const ways = new Map(full.elements.filter(element => element.type === "way").map(way => [way.id, way]));
  const completeRelation = full.elements.find(element => element.type === "relation" && element.id === relation.id);
  return {
    ...completeRelation,
    members: completeRelation.members.map(member => {
      if (member.type !== "way") return member;
      const way = ways.get(member.ref);
      return {
        ...member,
        geometry: way?.nodes?.map(nodeId => nodes.get(nodeId)).filter(Boolean).map(node => ({ lat: node.lat, lon: node.lon })) || []
      };
    })
  };
}

const hydratedElements = [];
for (let index = 0; index < data.elements.length; index += 6) {
  const batch = data.elements.slice(index, index + 6);
  hydratedElements.push(...await Promise.all(batch.map(element => element.type === "relation" ? hydrateRelation(element) : element)));
}

const convertedFeatures = hydratedElements.map(element => {
  const geometry = geometryFor(element);
  if (!geometry) return null;
  return {
    type: "Feature",
    properties: {
      osm_id: `${element.type}/${element.id}`,
      name: element.tags?.name,
      leisure: element.tags?.leisure || null,
      boundary: element.tags?.boundary || null,
      operator: element.tags?.operator || null,
      protection_title: element.tags?.protection_title || null,
      source: "OpenStreetMap",
      source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`
    },
    geometry
  };
}).filter(Boolean);
const convertedIds = new Set(convertedFeatures.map(feature => feature.properties.osm_id));
const unconverted = hydratedElements.filter(element => !convertedIds.has(`${element.type}/${element.id}`));

function ringsFor(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function boundsFor(geometry) {
  const points = ringsFor(geometry).flat();
  return points.reduce((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x), minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x), maxY: Math.max(bounds.maxY, y)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function boundsOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(polygon => pointInRing(point, polygon[0]) && !polygon.slice(1).some(hole => pointInRing(point, hole)));
}

const islandIndex = JSON.parse(fs.readFileSync(islandsFile, "utf8").replace(/^\uFEFF/, "")).features.map(feature => ({
  geometry: feature.geometry,
  bounds: boundsFor(feature.geometry),
  sample: ringsFor(feature.geometry)[0]?.[0]
}));

function touchesAnIsland(feature) {
  const featureBounds = boundsFor(feature.geometry);
  const featurePoints = ringsFor(feature.geometry).flat();
  return islandIndex.some(island => boundsOverlap(featureBounds, island.bounds) && (
    featurePoints.some(point => pointInGeometry(point, island.geometry)) ||
    (island.sample && pointInGeometry(island.sample, feature.geometry))
  ));
}

const features = convertedFeatures.filter(feature =>
  /Regional Park(?: Reserve)?$/i.test(feature.properties.name || "") && touchesAnIsland(feature)
);

fs.writeFileSync(output, JSON.stringify({
  type: "FeatureCollection",
  name: "osm-regional-parks-vancouver-island-working-extent",
  attribution: "© OpenStreetMap contributors, ODbL",
  retrievedAt: new Date().toISOString(),
  query,
  features
}, null, 2) + "\n");
console.log(`Matched ${data.elements.length} OSM elements; converted ${convertedFeatures.length}; retained ${features.length} island-region park polygons in ${output}`);
if (unconverted.length) console.log(`Unconverted: ${unconverted.map(element => `${element.type}/${element.id} ${element.tags?.name || "(unnamed)"}`).join("; ")}`);
