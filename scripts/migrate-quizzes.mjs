// veramed — one-time upgrade from a single quiz to several.
//
// Run after apply-schema: `node scripts/migrate-quizzes.mjs`.
//
// Before quizzes existed, questions hung straight off the company and every
// product with include_in_quiz = true was in "the" quiz. This moves those
// questions (quiz_id is null) into a quiz, so visitors keep seeing exactly
// the quiz they saw before:
//   - if the company has no quiz yet, it creates the main one ("main",
//     published, titled with the company tagline — the old quiz intro) and
//     puts in every non-deleted product that was in the quiz;
//   - otherwise the questions go into the existing main quiz (first by
//     "order"), and products are left alone.
//
// It first adds the quiz tables and columns itself (the same statements as
// supabase/schema.sql, additive and `if not exists` only), so it also works
// on a database where apply-schema.mjs must not run — e.g. the shared
// urgoods test database (see CLAUDE.md). Keep QUIZ_DDL in step with the quiz
// part of schema.sql.
//
// Safe to re-run: the DDL is idempotent and the data step only ever touches
// questions with no quiz, so a second run finds nothing to do. It never
// creates, edits or deletes anything a manager made through the dashboard.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText = readFileSync(path.join(root, ".env.local"), "utf8");
const pooled = envText.match(/^DATABASE_POOL_URL=(.+)$/m)?.[1]?.trim();
const direct = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const connectionString = pooled || direct;
if (!connectionString) throw new Error("Neither DATABASE_POOL_URL nor DATABASE_URL found in .env.local");

const companyId =
  envText.match(/^NEXT_PUBLIC_COMPANY_ID=(.+)$/m)?.[1]?.trim() ||
  JSON.parse(readFileSync(path.join(root, "supabase", "seed.json"), "utf8")).company.id;

const writePolicy = (table, brandExpr) => `
  drop policy if exists "manager writes own ${table}" on ${table};
  create policy "manager writes own ${table}" on ${table} for all
    using (${brandExpr}) with check (${brandExpr});`;
const isManager = (brandCol) =>
  `exists (select 1 from profiles where id = auth.uid() and role = 'admin')
     or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = ${brandCol})`;

const QUIZ_DDL = `
  create table if not exists quizzes (
    id uuid primary key default gen_random_uuid(),
    brand_id uuid not null references brands(id) on delete cascade,
    slug text not null,
    title_mn text not null,
    title_en text,
    status text not null default 'inactive' check (status in ('active','inactive')),
    "order" int not null default 0,
    created_at timestamptz not null default now(),
    unique (brand_id, slug)
  );
  create index if not exists quizzes_brand_id_idx on quizzes(brand_id);

  create table if not exists quiz_products (
    quiz_id uuid not null references quizzes(id) on delete cascade,
    product_id uuid not null references products(id) on delete cascade,
    primary key (quiz_id, product_id)
  );
  create index if not exists quiz_products_product_id_idx on quiz_products(product_id);

  alter table quiz_questions add column if not exists quiz_id uuid references quizzes(id) on delete cascade;
  create index if not exists quiz_questions_quiz_id_idx on quiz_questions(quiz_id);
  alter table quiz_sessions add column if not exists quiz_id uuid references quizzes(id) on delete set null;

  alter table quizzes enable row level security;
  alter table quiz_products enable row level security;
  drop policy if exists "public read quizzes" on quizzes;
  create policy "public read quizzes" on quizzes for select using (true);
  drop policy if exists "public read quiz_products" on quiz_products;
  create policy "public read quiz_products" on quiz_products for select using (true);
  ${writePolicy("quizzes", isManager("quizzes.brand_id"))}
  ${writePolicy("quiz_products", `exists (select 1 from quizzes qz where qz.id = quiz_products.quiz_id and (${isManager("qz.brand_id")}))`)}

  notify pgrst, 'reload schema';
`;

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query("begin");
  await client.query(QUIZ_DDL);
  console.log("schema: quiz tables and columns in place");

  const { rows: orphans } = await client.query(
    "select count(*)::int as n from quiz_questions where brand_id = $1 and quiz_id is null",
    [companyId]
  );
  if (orphans[0].n === 0) {
    console.log("questions: nothing to move, every question already belongs to a quiz");
    await client.query("commit");
  } else {
    const { rows: existing } = await client.query(
      `select id, slug from quizzes where brand_id = $1 order by "order", created_at limit 1`,
      [companyId]
    );

    let quizId;
    if (existing.length > 0) {
      quizId = existing[0].id;
      console.log(`quiz: using existing main quiz "${existing[0].slug}"`);
    } else {
      const { rows: brand } = await client.query(
        "select quiz_intro_mn, quiz_intro_en from brands where id = $1",
        [companyId]
      );
      if (brand.length === 0) throw new Error(`Company ${companyId} not found — run seed-supabase.mjs first`);
      const { rows: created } = await client.query(
        `insert into quizzes (brand_id, slug, title_mn, title_en, status, "order")
         values ($1, 'main', $2, $3, 'active', 0) returning id`,
        [companyId, brand[0].quiz_intro_mn, brand[0].quiz_intro_en]
      );
      quizId = created[0].id;
      const linked = await client.query(
        `insert into quiz_products (quiz_id, product_id)
         select $1, id from products
         where brand_id = $2 and status <> 'deleted' and include_in_quiz
         on conflict do nothing`,
        [quizId, companyId]
      );
      console.log(`quiz: created main quiz with ${linked.rowCount} products`);
    }

    const moved = await client.query(
      "update quiz_questions set quiz_id = $1 where brand_id = $2 and quiz_id is null",
      [quizId, companyId]
    );
    console.log(`questions: moved ${moved.rowCount} into the quiz`);
    await client.query("commit");
  }
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
