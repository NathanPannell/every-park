import { createClient } from "../lib/db.mjs";

const databaseName = process.env.TARGET_DATABASE || "every_park_db";
if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) {
  throw new Error("TARGET_DATABASE must be a lowercase PostgreSQL identifier.");
}

const client = createClient();
await client.connect();
try {
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
  if (existing.rowCount) {
    console.log(`Database ${databaseName} already exists.`);
  } else {
    await client.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Created database ${databaseName}.`);
  }
} finally {
  await client.end();
}

