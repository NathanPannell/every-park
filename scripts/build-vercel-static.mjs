import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(repoRoot, "demo-map");
const output = path.join(repoRoot, "dist");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "vendor", "leaflet"), { recursive: true });
fs.mkdirSync(path.join(output, "data"), { recursive: true });
for (const file of ["index.html", "styles.css", "app.js"]) fs.copyFileSync(path.join(source, file), path.join(output, file));
for (const file of ["leaflet.css", "leaflet.js"]) fs.copyFileSync(path.join(source, "vendor", "leaflet", file), path.join(output, "vendor", "leaflet", file));
fs.copyFileSync(path.join(source, "data", "island-outlines.geojson"), path.join(output, "data", "island-outlines.geojson"));
console.log("Built the database-backed map in dist/.");

