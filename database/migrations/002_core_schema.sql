CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  title text NOT NULL,
  publisher text NOT NULL,
  source_url text NOT NULL,
  licence_url text,
  retrieved_at timestamptz,
  source_version text,
  content_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

CREATE TABLE administrative_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  parent_id uuid REFERENCES administrative_areas(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('regional_district', 'municipality', 'electoral_area')),
  name text NOT NULL,
  short_name text NOT NULL,
  source_feature_id text NOT NULL,
  data_source_id uuid NOT NULL REFERENCES data_sources(id),
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  display_geometry geometry(MultiPolygon, 4326) NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('provincial', 'national', 'regional', 'island')),
  designation text NOT NULL,
  jurisdiction text NOT NULL,
  area_ha numeric,
  primary_admin_area_id uuid NOT NULL REFERENCES administrative_areas(id),
  status text NOT NULL DEFAULT 'official' CHECK (status IN ('official', 'provisional', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE place_geometries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('official', 'source', 'display')),
  data_source_id uuid NOT NULL REFERENCES data_sources(id),
  source_feature_id text NOT NULL,
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  geometry_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, role)
);

CREATE TABLE place_sources (
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  data_source_id uuid NOT NULL REFERENCES data_sources(id),
  source_feature_id text NOT NULL,
  source_url text,
  raw_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (place_id, data_source_id, source_feature_id)
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_places (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('visited', 'wishlist')),
  visited_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, place_id)
);

CREATE INDEX administrative_areas_parent_idx ON administrative_areas(parent_id);
CREATE INDEX administrative_areas_geometry_gix ON administrative_areas USING gist(geometry);
CREATE INDEX administrative_areas_display_geometry_gix ON administrative_areas USING gist(display_geometry);
CREATE INDEX places_admin_area_idx ON places(primary_admin_area_id);
CREATE INDEX places_kind_idx ON places(kind);
CREATE INDEX place_geometries_geometry_gix ON place_geometries USING gist(geometry);
CREATE INDEX place_sources_source_idx ON place_sources(data_source_id, source_feature_id);

