import fs from "node:fs";
import path from "node:path";
import { createClient, repoRoot } from "../lib/db.mjs";

const readCount = file => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8")).features.length;
const expectedPlaces = readCount("demo-map/data/parks-by-authority.geojson");
const expectedAdminAreas = readCount("demo-map/data/regional-authorities.geojson") + readCount("demo-map/data/local-subregions.geojson");
const client = createClient();

await client.connect();
try {
  const result = await client.query(`
    SELECT
      postgis_version() AS postgis_version,
      (SELECT count(*)::int FROM schema_migrations) AS migrations,
      (SELECT count(*)::int FROM places) AS places,
      (SELECT count(*)::int FROM administrative_areas) AS administrative_areas,
      (SELECT count(*)::int FROM place_geometries) AS geometries,
      (SELECT count(*)::int FROM place_geometries WHERE NOT ST_IsValid(geometry)) AS invalid_geometries,
      (SELECT count(*)::int FROM places p LEFT JOIN administrative_areas a ON a.id = p.primary_admin_area_id WHERE a.id IS NULL) AS orphan_places,
      (SELECT json_object_agg(kind, count) FROM (SELECT kind, count(*)::int AS count FROM places GROUP BY kind ORDER BY kind) counts) AS places_by_kind
  `);
  const summary = result.rows[0];
  if (summary.places !== expectedPlaces) throw new Error(`Expected ${expectedPlaces} places, found ${summary.places}`);
  if (summary.administrative_areas !== expectedAdminAreas) throw new Error(`Expected ${expectedAdminAreas} administrative areas, found ${summary.administrative_areas}`);
  if (summary.geometries !== expectedPlaces * 2) throw new Error(`Expected ${expectedPlaces * 2} geometries, found ${summary.geometries}`);
  if (summary.invalid_geometries !== 0 || summary.orphan_places !== 0) throw new Error("Spatial integrity validation failed");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await client.end();
}

