import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const repoRoot = path.dirname(databaseRoot);

function loadLocalEnvironment() {
  const requestedFile = process.env.EVERY_PARK_ENV_FILE
    ? path.resolve(repoRoot, process.env.EVERY_PARK_ENV_FILE)
    : null;
  const files = requestedFile
    ? [requestedFile, path.join(databaseRoot, ".env.local"), path.join(repoRoot, ".env.local")]
    : [path.join(databaseRoot, ".env.local"), path.join(repoRoot, ".env.local")];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

loadLocalEnvironment();

const sslMode = (process.env.PGSSLMODE || "").toLowerCase();
const ssl = ["require", "verify-ca", "verify-full"].includes(sslMode)
  ? { rejectUnauthorized: ["verify-ca", "verify-full"].includes(sslMode) }
  : false;

export function createClient(overrides = {}) {
  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl,
        ...overrides
      };
  return new pg.Client(config);
}
