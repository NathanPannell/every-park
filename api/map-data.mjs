import pg from "pg";

const { Pool } = pg;
const sslMode = (process.env.PGSSLMODE || "require").toLowerCase();
const pool = globalThis.__everyParkPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
  port: process.env.DATABASE_URL ? undefined : Number(process.env.PGPORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
  user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
  password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
  ssl: ["require", "verify-ca", "verify-full"].includes(sslMode)
    ? { rejectUnauthorized: ["verify-ca", "verify-full"].includes(sslMode) }
    : false,
  max: 4,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000
});
globalThis.__everyParkPool = pool;

const cacheHeaders = {
  "content-type": "application/geo+json; charset=utf-8",
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400"
};

function featureCollection(rows, properties) {
  return { type: "FeatureCollection", features: rows.map(row => ({ type: "Feature", properties: properties(row), geometry: row.geometry })) };
}

export async function GET(request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") || "overview";
  try {
    if (level === "health") {
      const result = await pool.query(`SELECT
        (SELECT count(*)::int FROM places) AS places,
        (SELECT count(*)::int FROM administrative_areas) AS administrative_areas,
        (SELECT count(*)::int FROM place_geometries WHERE NOT ST_IsValid(geometry)) AS invalid_geometries`);
      return Response.json({ ok: true, ...result.rows[0] }, { headers: { "cache-control": "no-store" } });
    }

    if (level === "overview") {
      const result = await pool.query(`SELECT a.external_id, a.name, a.short_name,
        ST_X(ST_PointOnSurface(a.display_geometry)) AS label_lon,
        ST_Y(ST_PointOnSurface(a.display_geometry)) AS label_lat,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(a.display_geometry, 0.002), 6)::json AS geometry, count(p.id)::int AS place_count,
        coalesce(json_agg(p.external_id ORDER BY p.external_id) FILTER (WHERE p.id IS NOT NULL), '[]') AS place_ids
        FROM administrative_areas a
        LEFT JOIN administrative_areas child ON child.parent_id = a.id
        LEFT JOIN places p ON p.primary_admin_area_id = child.id AND p.status <> 'retired'
        WHERE a.kind = 'regional_district' GROUP BY a.id ORDER BY a.short_name`);
      return Response.json(featureCollection(result.rows, row => ({
        authority_key: row.external_id.slice(3), authority_name: row.name, short_name: row.short_name,
        label_lon: Number(row.label_lon), label_lat: Number(row.label_lat),
        park_count: row.place_count, place_ids: row.place_ids
      })), { headers: cacheHeaders });
    }

    if (level === "authority") {
      const key = url.searchParams.get("key") || "";
      if (!/^[a-z]{3,4}$/.test(key)) return Response.json({ error: "Invalid authority key" }, { status: 400 });
      const result = await pool.query(`SELECT child.external_id, child.name, child.short_name, child.kind,
        ST_X(ST_PointOnSurface(child.display_geometry)) AS label_lon,
        ST_Y(ST_PointOnSurface(child.display_geometry)) AS label_lat,
        parent.external_id AS parent_external_id, ST_AsGeoJSON(ST_SimplifyPreserveTopology(child.display_geometry, 0.001), 6)::json AS geometry,
        count(p.id)::int AS place_count,
        coalesce(json_agg(p.external_id ORDER BY p.external_id) FILTER (WHERE p.id IS NOT NULL), '[]') AS place_ids
        FROM administrative_areas child JOIN administrative_areas parent ON parent.id = child.parent_id
        LEFT JOIN places p ON p.primary_admin_area_id = child.id AND p.status <> 'retired'
        WHERE parent.external_id = $1 GROUP BY child.id, parent.external_id HAVING count(p.id) > 0 ORDER BY child.short_name`, [`rd:${key}`]);
      return Response.json(featureCollection(result.rows, row => ({
        subregion_key: row.external_id, subregion_name: row.name, short_name: row.short_name,
        subregion_type: row.kind, authority_key: row.parent_external_id.slice(3),
        label_lon: Number(row.label_lon), label_lat: Number(row.label_lat),
        place_count: row.place_count, place_ids: row.place_ids
      })), { headers: cacheHeaders });
    }

    if (level === "subregion") {
      const key = url.searchParams.get("key") || "";
      if (!/^(mun|ea):\d+$/.test(key)) return Response.json({ error: "Invalid subregion key" }, { status: 400 });
      const result = await pool.query(`SELECT p.external_id, p.name, p.kind, p.area_ha, p.designation,
        sub.external_id AS subregion_key, sub.short_name AS subregion_name, sub.kind AS subregion_type,
        parent.external_id AS authority_external_id, parent.name AS authority_name,
        ST_Area(g.geometry::geography) AS rank_area, ST_AsGeoJSON(ST_SimplifyPreserveTopology(g.geometry, 0.00005), 6)::json AS geometry, ps.source_url,
        CASE p.kind WHEN 'provincial' THEN 'BC TANTALIS' WHEN 'national' THEN 'NRCan / CLSS'
          WHEN 'regional' THEN 'OpenStreetMap' WHEN 'island' THEN 'BC Freshwater Atlas' END AS source
        FROM places p JOIN administrative_areas sub ON sub.id = p.primary_admin_area_id
        JOIN administrative_areas parent ON parent.id = sub.parent_id
        JOIN place_geometries g ON g.place_id = p.id AND g.role = 'display'
        LEFT JOIN LATERAL (SELECT source_url FROM place_sources WHERE place_id = p.id ORDER BY is_primary DESC LIMIT 1) ps ON true
        WHERE sub.external_id = $1 AND p.status <> 'retired' ORDER BY p.name`, [key]);
      return Response.json(featureCollection(result.rows, row => ({
        park_id: row.external_id, name: row.name, park_type: row.kind,
        authority_key: row.authority_external_id.slice(3), authority_name: row.authority_name,
        subregion_key: row.subregion_key, subregion_name: row.subregion_name, subregion_type: row.subregion_type,
        area_ha: row.area_ha === null ? null : Number(row.area_ha), rank_area: Number(row.rank_area),
        designation: row.designation, source: row.source, source_url: row.source_url
      })), { headers: cacheHeaders });
    }

    return Response.json({ error: "Unknown hierarchy level" }, { status: 400 });
  } catch (error) {
    console.error("Map data request failed", error);
    return Response.json({ error: "Map data is temporarily unavailable" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
