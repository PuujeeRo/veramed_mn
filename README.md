# veramed.mn

Company website for **New Veramed LLC (Нью Верамед ХХК)** — a product catalog
plus a short quiz that recommends the company's own products to a visitor.

Cloned from the urgoods platform and reduced to a single company: no brand
slugs in URLs, no slots, tiers, payments or public signup.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # run before calling a change done
```

With no `.env.local` the public site runs on the **sample content** in
`supabase/seed.json` (five placeholder products and a five-question quiz).
That is for looking at the site only — signing in and the dashboard need a
database.

## Connect a database

Use a **new** Supabase project — never another app's (the schema creates
tables named `brands`, `products`, `profiles`, …).

1. Copy `.env.example` to `.env.local` and fill it in.
2. `node scripts/apply-schema.mjs` — creates the tables.
3. `node scripts/seed-supabase.mjs` — creates the company row and the sample
   products/quiz. Safe to re-run: it skips anything that already has content.
4. `node scripts/seed-auth.mjs` — creates the manager account from
   `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD`.
5. In the Supabase dashboard: Authentication → URL Configuration → add
   `{SITE_URL}/api/auth/callback` to the redirect allow-list (used when a
   manager changes their email).

## Pages

| Path | What |
|---|---|
| `/` | Home: tagline, the quiz's first question, products, about preview |
| `/products` | Full catalog, filterable by category |
| `/p/{id}` | One product (the link the dashboard copies / prints as QR) |
| `/quiz` | The recommendation quiz — anonymous, no account |
| `/about`, `/contact`, `/privacy` | Company pages |
| `/login` | Manager sign-in (linked quietly from the footer) |
| `/dashboard` | Manager: products, quiz, site content, stats |
| `/account` | Manager's own name, email, password |

Mongolian is the default and unprefixed; English lives under `/en/...`.

## What the manager can do

- **Products** — add, edit, publish/hide, delete; gallery, video, order
  link, page template; copy link and QR code per product; edit categories.
- **Quiz** — write questions and answers; each answer adds points to a
  category, and the quiz recommends products tagged with the top category.
- **Site content** — company name, logo, tagline, About text, contact details.
- **Stats** — quiz starts/completions, product views (web vs QR), order clicks.

See `CLAUDE.md` for the conventions to follow when changing the code.
