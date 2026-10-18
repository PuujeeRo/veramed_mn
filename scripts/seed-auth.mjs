// veramed — creates the manager account (and, optionally, an admin). Run
// after seed-supabase: `node scripts/seed-auth.mjs`. Safe to re-run — reuses
// an existing auth user by email and upserts its profile/membership.
//
// This script IS the signup flow: the site has no public registration, so a
// manager only ever exists because someone ran this (or added the same three
// rows by hand in the Supabase dashboard). To add a second manager, run it
// again with different SEED_MANAGER_* values.
//
// Credentials come from .env.local — required, with no fallback: a default
// password on a real company's site would be a standing invitation.
//
// Plain `fetch` against Supabase's GoTrue Admin API + PostgREST, NOT
// @supabase/supabase-js's createClient(): that client eagerly constructs a
// realtime WebSocket client, which can crash standalone Node scripts
// ("native WebSocket not found" on Node < 22).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText = readFileSync(path.join(root, ".env.local"), "utf8");
function envVar(name, { optional = false } = {}) {
  const value = envText.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim();
  if (value) return value;
  if (optional) return null;
  throw new Error(`${name} is not set in .env.local`);
}

const seed = JSON.parse(readFileSync(path.join(root, "supabase", "seed.json"), "utf8"));
const COMPANY_ID = seed.company.id;

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");

const authHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const accounts = [
  {
    email: envVar("SEED_MANAGER_EMAIL"),
    password: envVar("SEED_MANAGER_PASSWORD"),
    role: "brand_manager",
    fullName: "Manager",
  },
];
const adminEmail = envVar("SEED_ADMIN_EMAIL", { optional: true });
if (adminEmail) {
  accounts.push({
    email: adminEmail,
    password: envVar("SEED_ADMIN_PASSWORD"),
    role: "admin",
    fullName: "Admin",
  });
}

for (const acc of accounts) {
  if (acc.password.length < 12) throw new Error(`Password for ${acc.email} must be at least 12 characters`);
}

async function findUserIdByEmail(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, { headers: authHeaders });
  if (!res.ok) throw new Error(`listUsers failed: ${res.status} ${await res.text()}`);
  const { users } = await res.json();
  return users.find((u) => u.email === email)?.id ?? null;
}

for (const acc of accounts) {
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
  });

  let userId;
  let created = false;
  if (createRes.ok) {
    userId = (await createRes.json()).id;
    created = true;
  } else {
    const body = await createRes.text();
    if (!body.toLowerCase().includes("already") && !body.toLowerCase().includes("exists")) {
      throw new Error(`createUser(${acc.email}) failed: ${createRes.status} ${body}`);
    }
    userId = await findUserIdByEmail(acc.email);
    if (!userId) throw new Error(`${acc.email} reported as existing but not found`);
  }

  // A new account gets its name set; an existing one keeps whatever the
  // person has since put on /account (only the role is re-asserted).
  const profileBody = created
    ? { id: userId, role: acc.role, full_name: acc.fullName }
    : { id: userId, role: acc.role };
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...authHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(profileBody),
  });
  if (!profileRes.ok) {
    throw new Error(`profiles upsert(${acc.email}) failed: ${profileRes.status} ${await profileRes.text()}`);
  }

  if (acc.role === "brand_manager") {
    // on_conflict must name the real unique constraint (user_id, brand_id)
    // — without it PostgREST upserts against the PK (id), which isn't in
    // the body, so a re-run would insert a duplicate row every time.
    const memberRes = await fetch(`${SUPABASE_URL}/rest/v1/brand_members?on_conflict=user_id,brand_id`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: userId, brand_id: COMPANY_ID }),
    });
    if (!memberRes.ok) {
      throw new Error(`brand_members upsert(${acc.email}) failed: ${memberRes.status} ${await memberRes.text()}`);
    }
  }

  console.log(`${created ? "created" : "already existed"}: ${acc.role} — ${acc.email}`);
}

console.log("\nSign in at /login with the email above and its password from .env.local.");
