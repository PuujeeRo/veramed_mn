# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Company website for **New Veramed LLC (Нью Верамед ХХК)**, a Mongolian supplement company: a product catalog plus a short quiz that recommends the company's own products. Visitors are anonymous; one manager maintains everything from `/dashboard`. Mongolian is the default language, English is secondary. Cloned from the multi-brand "urgoods" platform and cut down to a single company. `README.md` covers database setup and the page list.

## Commands

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # production build + type-check + lint — must pass with no warnings
npm run lint          # ESLint only
npx tsc --noEmit -p . # fast type-check

node scripts/apply-schema.mjs      # apply supabase/schema.sql to the DB in .env.local (idempotent)
node scripts/seed-supabase.mjs     # first-time company row + sample products/quiz (skips tables that have data)
node scripts/seed-auth.mjs         # create the manager account from SEED_MANAGER_* in .env.local
node scripts/gen-placeholders.mjs  # regenerate the sample product SVGs in public/products
```

**Current dev database is shared with urgoods.** The local `.env.local` points at the urgoods *test* Supabase project (`D:\Projects\ur_goods_com`); only the UI differs. `NEXT_PUBLIC_COMPANY_ID` is set to urgoods' demo "Brand A" row, and sign-in uses the urgoods Brand A manager account. While that is the case:
- **Do not run `apply-schema.mjs`, `seed-supabase.mjs` or `seed-auth.mjs`** — urgoods owns that schema, its RLS policies and its seed data.
- The shared DB lacks two veramed-only columns, `brands.contact` and `products.accent`. Reads work; saving site content or a product edit fails until they are added (nullable, additive — harmless to urgoods).
- Moving to veramed's own Supabase project later = new keys in `.env.local`, drop `NEXT_PUBLIC_COMPANY_ID`, then run the three scripts above.

There is no test suite. Verification is `npm run build` plus checking pages in a browser.

`next build` and `next dev` share `.next/` — never run a build while a dev server is running in the same folder; it breaks the dev server until restarted.

## Architecture

**One company.** The DB keeps a multi-tenant shape (`brands` table, `brand_id` on everything, the `Brand` type) but the site only ever reads one row, `COMPANY_ID` in `lib/company.ts` — `NEXT_PUBLIC_COMPANY_ID` if set, otherwise the default that matches `supabase/seed.json`. API routes keep the `/api/brands/[brandId]/…` shape and are called with `COMPANY_ID`. Nothing looks a company up by slug.

**Request flow.** `middleware.ts` does three things: refreshes the Supabase session cookie, gates `/dashboard*` and `/account*` (signed-in user with a `profiles` row, plus a `brand_members` row for the company unless `role = admin`), and runs next-intl locale routing for everything except `/api/**`. Every page lives under `app/[locale]/`; each is a thin Server Component that fetches data (`force-dynamic`, always the latest save) and renders a client `*View` component. `app/[locale]/(site)/` holds the visitor pages and shares `SiteHeader`/`SiteFooter` via its layout; `dashboard/` and `account/` render inside `DashboardShell` instead.

**Data source switch.** `lib/data.ts` and `lib/categories.ts` read Supabase through the anon client (public-read RLS). When `isSupabaseConfigured()` is false (no keys in `.env.local`) they return `supabase/seed.json` instead, so the public site renders with sample content. It is a whole-source switch, never a merge. Without a database, gated pages redirect to `/login` and nobody can sign in.

**Write path.** Every write goes through an `app/api/**` route that calls `getSessionProfile()` + `canManageBrand()` (`lib/auth.ts`) itself, validates with zod, then writes with `supabaseAdmin` (service role). Middleware guards navigation only; RLS write policies are defense in depth. Rich text is sanitized server-side (`lib/sanitize.ts`); URL fields that end up in an `href` are validated as http(s). There is no public signup — accounts only come from `scripts/seed-auth.mjs`, and `/api/auth/callback` never creates a `profiles` row.

**Quiz.** Each quiz answer adds `points` to a category slug. `lib/scoring.ts` (pure — takes questions and products as arguments, never fetches) sums points, takes the top category plus any within one point, and returns published, quiz-enabled products tagged with those categories, ordered by `boostScore`. `QuizFlow` shows the top 1–2 in `ProductCard` (results are never templated, so they stay comparable). The quiz editor saves the whole question set in one `PUT` (server assigns ids; the new set is inserted before the old one is deleted).

**Product pages.** A template (`lib/templates.ts`: Showcase — the default — Classic, Gallery-first, Minimal) is only an ordering of shared blocks in `components/product-blocks/`; never put bespoke markup in a template. Each product also has a colour theme (`lib/accents.ts` ids → `.accent-*` palettes in `app/globals.css`). Content placed on a strong accent colour goes inside `.on-accent`, which re-points the theme tokens so the shared blocks render in the accent's ink without knowing they're on colour.

**Product status.** `active` = published, `inactive` = hidden (new products start hidden), `deleted` = soft delete so stats rows stay attributable. Visitor reads filter to `active`; dashboard reads include `inactive`.

**Stats.** Visitor events (`product_views`, `product_clicks`, `quiz_sessions`, `quiz_results`) are recorded by unauthenticated API routes, fire-and-forget from `lib/stats.ts`. Reading them back is owner-checked and aggregated in Postgres (`brand_stats()` in `schema.sql`) — counting raw rows in JS silently caps at PostgREST's 1000-row limit.

**Database scripts run against the live DB.** `schema.sql` is DDL only and must stay safe to re-run (`if not exists`, drop-then-add constraints). Seed data must never resurrect into a database with real rows: guard each seed block on "does this table already have rows for the company", never on per-row `on conflict`.

## i18n

- Every user-facing string goes through `t()` from `lib/i18n.tsx`, with the key in **both** `locales/mn.json` and `locales/en.json` (flat dotted keys). Interpolate (`t("k", { n })`), never concatenate. Mongolian must read like Mongolian, not translated English.
- next-intl handles routing only. Its message pipeline rejects flat dotted keys, so `i18n/request.ts` returns `messages: {}` on purpose and `lib/messages.ts` loads catalogs server-side (SSR per locale, no client detection). Deleting `i18n/request.ts` breaks every page.
- The URL alone decides the language (`localeDetection: false` in `lib/routing.ts`): `/…` is Mongolian, `/en/…` English.
- Internal links and navigation must use `lib/navigation.ts` (`Link`, `useRouter`, `usePathname`, `redirect`), not `next/link`, or the locale is dropped. Deliberate exceptions: `NotFoundContent` (renders outside the locale tree) and copy-link/QR URLs, which stay unprefixed so a printed code never depends on the manager's language.
- Company-authored content (`*_mn` / `*_en` columns): MN required, EN optional, resolved with `localized()`.

## UI conventions

- **Dashboard:** every screen sits in `DashboardShell`, starts with `PageHeader`, and is a stack of `Section` cards from `components/ui/`. Inputs use `.field` + `Field`; buttons use `.btn-primary/.btn-secondary/.btn-ghost/.btn-danger` (+ `.btn-sm`) from `app/globals.css`. Don't hand-roll one-off input or button styles.
- **Whole-form editors save through `UnsavedBar`** with `useFormState` for the dirty baseline (appears only when something changed, Ctrl/Cmd+S saves, warns before the tab closes, explains why Save is blocked). Confirmations go to `useToast()`; irreversible actions go through `ConfirmDialog`.
- `RichTextEditor` seeds its content with the Lexical `history-merge` tag so loading saved text never marks a form dirty; remount it (bump its `key`) to show a discarded value.
- Status colours carry meaning: green published/OK, neutral hidden, amber needs attention, red error/destructive. Brand red is for actions, never a status.
- Colours are tokens in `app/globals.css` (`--brand-*`, `--fg`, `--surface`…, redefined under `.dark`); never hardcode hex in components. `.brand-gradient` is for thin accents only.
- Page-level grids that become columns at `lg` need an explicit `grid-cols-1` below it, or an `auto` track grows to its widest child and clips content on phones.
- Fonts: Wix Madefor Display (headings, `font-display`) + Wix Madefor Text (body). A replacement font must ship `cyrillic-ext` (Mongolian Ө/Ү).
- `public/logo.png` is the transparent heart mark; `public/logo-full.png` is the full lockup with a black tagline, so it must sit on white.

## Product rules

- Health claims: never "cures", "treats", "diagnoses" / «эмчилнэ», «эдгээнэ», «оношилно». Always "may support" / «дэмжлэг үзүүлж болзошгүй» — UI copy, seed content and quiz text alike.
- Out of scope: checkout, cart, customer accounts, inventory. The Order button deep-links to the company's own channel (store or Messenger).
- Video is click-to-play, never autoplay.

## Dependency notes

- Next.js is pinned to 14.2.x (15+ makes `params`/`searchParams` async).
- Lexical uses a named export: `import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"`.
- `next/image` needs every external host in `next.config.js` (`res.cloudinary.com`, `i.ytimg.com`); local SVGs are rendered `unoptimized`. `next.config.js` changes need a dev-server restart.
- Image upload uses Cloudinary only when `NEXT_PUBLIC_CLOUDINARY_*` are set (`isCloudinaryConfigured()`); otherwise `ImageUploadField` falls back to a pasted URL.
- Standalone scripts use `fetch`/`pg`, not `@supabase/supabase-js` (its realtime client can crash plain Node scripts).

## Before calling a change done

1. `npm run build` passes with no warnings.
2. If product or quiz behaviour changed: sign in, edit in `/dashboard`, save, and confirm it shows on `/quiz` and the product page.
3. If strings changed: check both `/…` (MN) and `/en/…`.
4. Check the narrowest layout (280px) in MN. Headless browsers can't size a window below ~500px with `--window-size`; use real device emulation (DevTools protocol) for phone-width checks.
