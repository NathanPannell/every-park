import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "../lib/db.mjs";

const migrationsDir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "migrations");
const client = createClient();

await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const appliedResult = await client.query("SELECT version, checksum FROM schema_migrations");
  const applied = new Map(appliedResult.rows.map(row => [row.version, row.checksum]));
  const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith(".sql")).sort();
  let appliedCount = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    if (applied.has(file)) {
      if (applied.get(file) !== checksum) throw new Error(`Previously applied migration changed: ${file}`);
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)", [file, checksum]);
      await client.query("COMMIT");
      appliedCount++;
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  console.log(`Migrations ready (${appliedCount} applied, ${files.length - appliedCount} already current).`);
} finally {
  await client.end();
}

