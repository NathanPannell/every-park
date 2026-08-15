# Database

PostgreSQL 15+ with PostGIS is required. A local Docker service is included
because the machine's native PostgreSQL installation does not include PostGIS:

```powershell
npm run db:up
npm run db:setup
npm run db:validate
```

The development service listens on `localhost:5433` so it does not conflict
with an existing PostgreSQL server on port 5432. Connection settings are read from
`DATABASE_URL` or the standard `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`,
`PGPASSWORD`, and `PGSSLMODE` variables. For local development, the scripts
first read the ignored `database/.env.local`, then the repository `.env.local`.

```powershell
npm run db:migrate
npm run db:load
```

`npm run db:setup` runs both commands. Migrations are applied once and recorded
with SHA-256 checksums in `schema_migrations`. The loader is transactional and
idempotently upserts the current generated map data while preserving source
records, raw attributes, official/source geometry, and display geometry.

The current island threshold is 500 hectares.

## Production

Point `EVERY_PARK_ENV_FILE` at a protected environment file (or provide
`DATABASE_URL`). Create the database through an administrative database, then
set `PGDATABASE=every_park_db` while running migrations and the loader:

```powershell
$env:EVERY_PARK_ENV_FILE='.env.local'
$env:TARGET_DATABASE='every_park_db'
npm run db:create
$env:PGDATABASE='every_park_db'
npm run db:setup
```
