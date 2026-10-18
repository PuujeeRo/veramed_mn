// veramed — applies supabase/schema.sql against the database in .env.local.
// Run after any schema.sql change: `node scripts/apply-schema.mjs`.
// Reads the connection string from .env.local directly (no dotenv dependency).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText = readFileSync(path.join(root, ".env.local"), "utf8");
// Prefer the pooler (IPv4) if filled in — Supabase's direct db.* host is
// IPv6-only on many projects and plenty of networks can't route it.
const pooled = envText.match(/^DATABASE_POOL_URL=(.+)$/m)?.[1]?.trim();
const direct = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const connectionString = pooled || direct;
if (!connectionString) throw new Error("Neither DATABASE_POOL_URL nor DATABASE_URL found in .env.local");

const sql = readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("schema.sql applied successfully");
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  console.log("tables present:", rows.map((r) => r.table_name));
} finally {
  await client.end();
}
