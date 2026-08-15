import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, repoRoot } from "../lib/db.mjs";

const readJson = file => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8").replace(/^\uFEFF/, ""));
const demoAuthorities = readJson("demo-map/data/regional-authorities.geojson").features;
const demoSubregions = readJson("demo-map/data/local-subregions.geojson").features;
const demoPlaces = readJson("demo-map/data/parks-by-authority.geojson").features;

const rawRegionalDistricts = readJson("data-research/raw/bc-regional-districts.geojson").features;
const rawMunicipalities = readJson("data-research/raw/bc-municipalities.geojson").features;
const rawElectoralAreas = readJson("data-research/raw/bc-electoral-areas.geojson").features;
const rawProvincial = readJson("data-research/raw/bc-parks-protected-areas.geojson").features;
const rawNational = readJson("data-research/raw/canada-national-parks.geojson").features;
const rawRegional = readJson("data-research/derived/osm-regional-parks.geojson").features;
const rawIslands = readJson("data-research/derived/vancouver-island-islands.geojson").features;

const sources = [
  { key: "bc_tantalis", title: "BC Parks, Ecological Reserves and Protected Areas", publisher: "Province of British Columbia", url: "https://catalogue.data.gov.bc.ca/dataset/bc-parks-ecological-reserves-and-protected-areas", licence: "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-license-bc" },
  { key: "nrcan_clss", title: "National Parks and National Park Reserves Legislative Boundaries", publisher: "Natural Resources Canada", url: "https://proxyinternet.nrcan-rncan.gc.ca/arcgis/rest/services/CLSS-SATC/CLSS_Administrative_Boundaries/MapServer/1", licence: "https://open.canada.ca/en/open-government-licence-canada" },
  { key: "openstreetmap", title: "OpenStreetMap regional park polygons", publisher: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", licence: "https://opendatacommons.org/licenses/odbl/" },
  { key: "bc_freshwater_atlas", title: "Freshwater Atlas Islands", publisher: "Province of British Columbia", url: "https://catalogue.data.gov.bc.ca/dataset/4483aeea-df26-4b83-a565-934c769e74de", licence: "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-license-bc" },
  { key: "bc_admin_regional_districts", title: "Regional Districts - Legally Defined Administrative Areas", publisher: "Province of British Columbia", url: "https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/474", licence: "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-license-bc" },
  { key: "bc_admin_municipalities", title: "Municipalities - Legally Defined Administrative Areas", publisher: "Province of British Columbia", url: "https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/3", licence: "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-license-bc" },
  { key: "bc_admin_electoral_areas", title: "Electoral Areas - Legally Defined Administrative Areas", publisher: "Province of British Columbia", url: "https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/495", licence: "https://www2.gov.bc.ca/gov/content/data/open-data/open-government-license-bc" }
];

const client = createClient();
const geometryJson = feature => JSON.stringify(feature.geometry);
const geometryHash = feature => crypto.createHash("sha256").update(geometryJson(feature)).digest("hex");
const byProperty = (features, property) => new Map(features.map(feature => [String(feature.properties[property]), feature]));
const sourceLookups = {
  provincial: byProperty(rawProvincial, "ADMIN_AREA_SID"),
  national: new Map(rawNational.map(feature => [String(feature.properties.adminAreaId || feature.properties.OBJECTID || feature.properties.adminAreaNameEng), feature])),
  regional: byProperty(rawRegional, "osm_id"),
  island: byProperty(rawIslands, "ISLAND_ID")
};

function placeSourceKey(kind) {
  return { provincial: "bc_tantalis", national: "nrcan_clss", regional: "openstreetmap", island: "bc_freshwater_atlas" }[kind];
}

function designation(kind) {
  return { provincial: "Provincial Park", national: "National Park or Park Reserve", regional: "Regional Park", island: "Island" }[kind];
}

function jurisdiction(kind) {
  return { provincial: "provincial", national: "national", regional: "regional", island: "geographic" }[kind];
}

async function upsertSource(source) {
  const result = await client.query(`
    INSERT INTO data_sources(source_key, title, publisher, source_url, licence_url, retrieved_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (source_key) DO UPDATE SET
      title = EXCLUDED.title, publisher = EXCLUDED.publisher, source_url = EXCLUDED.source_url,
      licence_url = EXCLUDED.licence_url, retrieved_at = EXCLUDED.retrieved_at, updated_at = now()
    RETURNING id
  `, [source.key, source.title, source.publisher, source.url, source.licence]);
  return result.rows[0].id;
}

async function upsertAdminArea(feature, parentId, sourceKey, rawFeature) {
  const properties = feature.properties;
  const isAuthority = !properties.subregion_key;
  const externalId = isAuthority ? `rd:${properties.authority_key}` : properties.subregion_key;
  const kind = isAuthority ? "regional_district" : properties.subregion_type;
  const result = await client.query(`
    INSERT INTO administrative_areas(
      external_id, parent_id, kind, name, short_name, source_feature_id, data_source_id,
      geometry, display_geometry, properties
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)), 3)),
      ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($9), 4326)), 3)), $10::jsonb
    )
    ON CONFLICT (external_id) DO UPDATE SET
      parent_id = EXCLUDED.parent_id, kind = EXCLUDED.kind, name = EXCLUDED.name,
      short_name = EXCLUDED.short_name, source_feature_id = EXCLUDED.source_feature_id,
      data_source_id = EXCLUDED.data_source_id, geometry = EXCLUDED.geometry,
      display_geometry = EXCLUDED.display_geometry, properties = EXCLUDED.properties, updated_at = now()
    RETURNING id
  `, [
    externalId, parentId, kind, properties.authority_name || properties.subregion_name,
    properties.short_name, String(properties.source_id), sourceIds.get(sourceKey),
    geometryJson(rawFeature), geometryJson(feature), JSON.stringify(rawFeature.properties)
  ]);
  return result.rows[0].id;
}

const sourceIds = new Map();
const adminIds = new Map();
await client.connect();
let importRunId;
try {
  const run = await client.query("INSERT INTO import_runs(status, metadata) VALUES ('running', $1::jsonb) RETURNING id", [JSON.stringify({ loader: "database/scripts/load-data.mjs", island_cutoff_ha: 500 })]);
  importRunId = run.rows[0].id;
  await client.query("BEGIN");

  for (const source of sources) sourceIds.set(source.key, await upsertSource(source));

  const regionalLookup = byProperty(rawRegionalDistricts, "LGL_ADMIN_AREA_ID");
  for (const feature of demoAuthorities) {
    const rawFeature = regionalLookup.get(String(feature.properties.source_id));
    if (!rawFeature) throw new Error(`Missing raw regional district ${feature.properties.source_id}`);
    adminIds.set(`rd:${feature.properties.authority_key}`, await upsertAdminArea(feature, null, "bc_admin_regional_districts", rawFeature));
  }

  const municipalityLookup = byProperty(rawMunicipalities, "LGL_ADMIN_AREA_ID");
  const electoralLookup = byProperty(rawElectoralAreas, "LGL_ADMIN_AREA_ID");
  for (const feature of demoSubregions) {
    const isMunicipality = feature.properties.subregion_type === "municipality";
    const rawFeature = (isMunicipality ? municipalityLookup : electoralLookup).get(String(feature.properties.source_id));
    if (!rawFeature) throw new Error(`Missing raw local area ${feature.properties.source_id}`);
    const parentId = adminIds.get(`rd:${feature.properties.authority_key}`);
    const id = await upsertAdminArea(feature, parentId, isMunicipality ? "bc_admin_municipalities" : "bc_admin_electoral_areas", rawFeature);
    adminIds.set(feature.properties.subregion_key, id);
  }

  const loadedPlaceIds = [];
  for (const feature of demoPlaces) {
    const properties = feature.properties;
    const kind = properties.park_type;
    const sourceFeatureId = properties.park_id.slice(properties.park_id.indexOf(":") + 1);
    const rawFeature = sourceLookups[kind].get(sourceFeatureId);
    if (!rawFeature) throw new Error(`Missing raw source feature for ${properties.park_id}`);
    const placeResult = await client.query(`
      INSERT INTO places(external_id, name, kind, designation, jurisdiction, area_ha, primary_admin_area_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name, kind = EXCLUDED.kind, designation = EXCLUDED.designation,
        jurisdiction = EXCLUDED.jurisdiction, area_ha = EXCLUDED.area_ha,
        primary_admin_area_id = EXCLUDED.primary_admin_area_id, status = EXCLUDED.status,
        updated_at = now()
      RETURNING id
    `, [properties.park_id, properties.name, kind, designation(kind), jurisdiction(kind), properties.area_ha, adminIds.get(properties.subregion_key), kind === "regional" ? "provisional" : "official"]);
    const placeId = placeResult.rows[0].id;
    loadedPlaceIds.push(properties.park_id);
    const sourceKey = placeSourceKey(kind);
    const dataSourceId = sourceIds.get(sourceKey);

    await client.query(`
      INSERT INTO place_sources(place_id, data_source_id, source_feature_id, source_url, raw_properties, is_primary)
      VALUES ($1, $2, $3, $4, $5::jsonb, true)
      ON CONFLICT (place_id, data_source_id, source_feature_id) DO UPDATE SET
        source_url = EXCLUDED.source_url, raw_properties = EXCLUDED.raw_properties, is_primary = true
    `, [placeId, dataSourceId, sourceFeatureId, properties.source_url || sources.find(source => source.key === sourceKey).url, JSON.stringify(rawFeature.properties)]);

    const sourceRole = kind === "regional" ? "source" : "official";
    for (const [role, geometryFeature] of [[sourceRole, rawFeature], ["display", feature]]) {
      await client.query(`
        INSERT INTO place_geometries(place_id, role, data_source_id, source_feature_id, geometry, geometry_hash)
        VALUES ($1, $2, $3, $4, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)), 3)), $6)
        ON CONFLICT (place_id, role) DO UPDATE SET
          data_source_id = EXCLUDED.data_source_id, source_feature_id = EXCLUDED.source_feature_id,
          geometry = EXCLUDED.geometry, geometry_hash = EXCLUDED.geometry_hash
      `, [placeId, role, dataSourceId, sourceFeatureId, geometryJson(geometryFeature), geometryHash(geometryFeature)]);
    }
  }

  await client.query("DELETE FROM places WHERE kind = ANY($1::text[]) AND NOT (external_id = ANY($2::text[]))", [["provincial", "national", "regional", "island"], loadedPlaceIds]);
  const loadedAdminIds = [...adminIds.keys()];
  await client.query("DELETE FROM administrative_areas WHERE (external_id LIKE 'mun:%' OR external_id LIKE 'ea:%') AND NOT (external_id = ANY($1::text[]))", [loadedAdminIds]);
  await client.query("COMMIT");
  await client.query("UPDATE import_runs SET status = 'completed', completed_at = now(), metadata = metadata || $2::jsonb WHERE id = $1", [importRunId, JSON.stringify({ places: demoPlaces.length, administrative_areas: demoAuthorities.length + demoSubregions.length })]);
  console.log(`Loaded ${demoPlaces.length} places and ${demoAuthorities.length + demoSubregions.length} administrative areas.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  if (importRunId) await client.query("UPDATE import_runs SET status = 'failed', completed_at = now(), error_message = $2 WHERE id = $1", [importRunId, error.message]).catch(() => {});
  throw error;
} finally {
  await client.end();
}
