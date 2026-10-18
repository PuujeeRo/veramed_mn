// veramed — first-time seed: the company row plus sample categories,
// products and quiz questions from supabase/seed.json (the same file the
// site shows while no database is configured).
//
// Run once after apply-schema: `node scripts/seed-supabase.mjs`.
//
// Safe to re-run, and safe against a live database: each block is guarded
// on "does any real content of this kind exist yet", never on per-row
// conflict clauses. A manager who has edited the quiz or deleted every
// sample product must never get the samples resurrected alongside their
// real rows — so once a table has content for the company, its block is
// skipped entirely. The company row itself is insert-only (never updated),
// so name/tagline/about edits made in the dashboard survive too.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText = readFileSync(path.join(root, ".env.local"), "utf8");
// Prefer the pooler (IPv4) if it's been filled in; fall back to the direct
// connection otherwise.
const pooled = envText.match(/^DATABASE_POOL_URL=(.+)$/m)?.[1]?.trim();
const direct = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const connectionString = pooled || direct;
if (!connectionString) throw new Error("Neither DATABASE_POOL_URL nor DATABASE_URL found in .env.local");

const seed = JSON.parse(readFileSync(path.join(root, "supabase", "seed.json"), "utf8"));
const c = seed.company;

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

async function count(table) {
  const { rows } = await client.query(`select count(*)::int as n from ${table} where brand_id = $1`, [c.id]);
  return rows[0].n;
}

try {
  await client.query("begin");

  const inserted = await client.query(
    `insert into brands (id, slug, name, logo_url, quiz_intro_mn, quiz_intro_en, about_mn, about_en, contact)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do nothing`,
    [c.id, c.slug, c.name, c.logo_url, c.quiz_intro_mn, c.quiz_intro_en, c.about_mn, c.about_en, JSON.stringify(c.contact)]
  );
  console.log(inserted.rowCount ? "company: created" : "company: already exists, left untouched");

  if ((await count("categories")) === 0) {
    for (const cat of seed.categories) {
      await client.query(
        "insert into categories (brand_id, slug, name_mn, name_en) values ($1,$2,$3,$4)",
        [c.id, cat.slug, cat.name_mn, cat.name_en]
      );
    }
    console.log(`categories: seeded ${seed.categories.length}`);
  } else {
    console.log("categories: already has content, skipped");
  }

  if ((await count("products")) === 0) {
    for (const p of seed.products) {
      await client.query(
        `insert into products
           (id, brand_id, name_mn, name_en, description_mn, description_en, price, image_url,
            gallery_urls, page_template, accent, categories, include_in_quiz, buy_now_url, boost_score)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          p.id, c.id, p.name_mn, p.name_en, p.description_mn, p.description_en, p.price, p.image_url,
          p.gallery_urls, p.page_template, p.accent, p.categories, p.include_in_quiz, p.buy_now_url, p.boost_score,
        ]
      );
    }
    console.log(`products: seeded ${seed.products.length} (samples — replace from /dashboard)`);
  } else {
    console.log("products: already has content, skipped");
  }

  if ((await count("quiz_questions")) === 0) {
    for (const [qi, q] of seed.questions.entries()) {
      await client.query(
        `insert into quiz_questions (id, brand_id, text_mn, text_en, "order") values ($1,$2,$3,$4,$5)`,
        [q.id, c.id, q.text_mn, q.text_en, qi + 1]
      );
      for (const [ai, a] of q.answers.entries()) {
        await client.query(
          `insert into quiz_answers (question_id, text_mn, text_en, category, points, "order")
           values ($1,$2,$3,$4,$5,$6)`,
          [q.id, a.text_mn, a.text_en, a.category, a.points, ai + 1]
        );
      }
    }
    console.log(`quiz: seeded ${seed.questions.length} questions`);
  } else {
    console.log("quiz: already has content, skipped");
  }

  await client.query("commit");
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
