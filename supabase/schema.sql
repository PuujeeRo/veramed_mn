-- veramed — full schema. One company (see lib/company.ts), its products,
-- its quizzes, and the anonymous traffic/funnel events behind the
-- dashboard's Stats tab.
--
-- Run with `node scripts/apply-schema.mjs`. Every statement is idempotent
-- (create ... if not exists / drop policy if exists), so re-running it
-- against a live database is safe. There is NO seed data in this file on
-- purpose — sample content goes in through scripts/seed-supabase.mjs, which
-- refuses to touch a database that already holds real rows.
--
-- The tables keep a `brand_id` column and the company lives in `brands`:
-- the shape this was cloned from. There is exactly one row in `brands`.
--
-- RLS: public read where visitors need it (company, products, categories,
-- quiz). Every write goes through a Next.js API route using the
-- service_role key after its own ownership check (lib/auth.ts); the write
-- policies below are defense-in-depth, not the only check.

create extension if not exists pgcrypto;

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text not null,
  quiz_intro_mn text not null,   -- tagline: home page headline (each quiz has its own title)
  quiz_intro_en text,
  about_mn text,
  about_en text,
  contact jsonb,                 -- { phone, email, address, facebook, instagram }
  created_at timestamptz not null default now()
);
-- `create table if not exists` skips a table that already exists, so a
-- database created from an older version of this schema never gets the
-- columns added since. Keep these in step with the table above.
alter table brands add column if not exists slug text;
alter table brands add column if not exists name text;
alter table brands add column if not exists logo_url text;
alter table brands add column if not exists quiz_intro_mn text;
alter table brands add column if not exists quiz_intro_en text;
alter table brands add column if not exists about_mn text;
alter table brands add column if not exists about_en text;
alter table brands add column if not exists contact jsonb;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name_mn text not null,
  name_en text,
  description_mn text not null,
  description_en text,
  price integer not null,
  image_url text not null,
  gallery_urls text[],
  video_url text,
  page_template text,
  accent text,
  categories text[] not null default '{}',
  include_in_quiz boolean not null default true,
  buy_now_url text,
  boost_score numeric not null default 0,
  -- inactive = hidden by the manager; deleted = soft-deleted.
  status text not null default 'active' check (status in ('active','inactive','deleted')),
  social jsonb,
  contact jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_brand_id_idx on products(brand_id);

-- Columns and checks added after the table first shipped — written as
-- add-if-missing / drop-then-add so re-running this file upgrades an
-- existing database instead of skipping it (create table if not exists
-- never alters a table that's already there).
alter table products add column if not exists accent text;
-- `page_tier` is from the platform this was cloned from; nothing here uses
-- it, but an older database still requires it on every insert.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'products' and column_name = 'page_tier') then
    alter table products alter column page_tier drop not null;
  end if;
end $$;
alter table products drop constraint if exists products_page_template_check;
alter table products add constraint products_page_template_check
  check (page_template in ('showcase','classic','gallery-first','minimal'));
-- Keep in sync with lib/accents.ts.
alter table products drop constraint if exists products_accent_check;
alter table products add constraint products_accent_check
  check (accent in ('crimson','sunset','sun','sky','sage'));

alter table brands enable row level security;
alter table products enable row level security;

drop policy if exists "public read brands" on brands;
create policy "public read brands" on brands for select using (true);

drop policy if exists "public read active products" on products;
create policy "public read active products" on products for select using (status <> 'deleted');

-- One row per Supabase Auth user. Created by scripts/seed-auth.mjs — there
-- is no public signup.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('brand_manager','admin')),
  full_name text,
  username text,
  created_at timestamptz not null default now()
);
-- Unique index still permits multiple NULLs.
create unique index if not exists profiles_username_key on profiles (username);

alter table profiles enable row level security;

drop policy if exists "users read own profile" on profiles;
create policy "users read own profile" on profiles for select using (auth.uid() = id);

-- Who may manage the company. A second manager is one more row here.
create table if not exists brand_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

alter table brand_members enable row level security;

drop policy if exists "users read own memberships" on brand_members;
create policy "users read own memberships" on brand_members for select
  using (auth.uid() = user_id);

drop policy if exists "manager writes own brand" on brands;
create policy "manager writes own brand" on brands for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = brands.id)
  );

-- "for all" (not just update) so a signed-in manager can also see hidden
-- products, which the public read policy's callers filter out — permissive
-- policies for the same command OR together, so this only adds visibility.
drop policy if exists "manager writes own products" on products;
create policy "manager writes own products" on products for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = products.brand_id)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = products.brand_id)
  );

-- What products are tagged with and what quiz answers add points to.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  slug text not null,
  name_mn text not null,
  name_en text,
  unique (brand_id, slug)
);

alter table categories enable row level security;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "manager writes own categories" on categories;
create policy "manager writes own categories" on categories for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = categories.brand_id)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = categories.brand_id)
  );

-- The company can run several quizzes. Each has its own questions and its
-- own list of products it recommends from (quiz_products — a product can
-- sit in several). Visitors open one at /quiz/{slug}; /quiz itself shows
-- the main one: the first published quiz by "order".
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  slug text not null,
  title_mn text not null,        -- the headline on the quiz's intro screen
  title_en text,
  -- New quizzes start hidden, like new products.
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

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  quiz_id uuid references quizzes(id) on delete cascade,
  text_mn text not null,
  text_en text,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_brand_id_idx on quiz_questions(brand_id);
-- Nullable only for questions saved before quizzes existed;
-- scripts/migrate-quizzes.mjs moves those into a quiz. Every read filters
-- on quiz_id, so a question without one is never shown.
alter table quiz_questions add column if not exists quiz_id uuid references quizzes(id) on delete cascade;
create index if not exists quiz_questions_quiz_id_idx on quiz_questions(quiz_id);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  text_mn text not null,
  text_en text,
  category text not null,
  points numeric not null default 1,
  "order" int not null default 0
);
create index if not exists quiz_answers_question_id_idx on quiz_answers(question_id);

alter table quizzes enable row level security;
alter table quiz_products enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_answers enable row level security;

-- Public read — a visitor takes the quiz with no account. Hidden quizzes
-- are readable too (as hidden products are); visitor pages filter them out.
drop policy if exists "public read quizzes" on quizzes;
create policy "public read quizzes" on quizzes for select using (true);
drop policy if exists "public read quiz_products" on quiz_products;
create policy "public read quiz_products" on quiz_products for select using (true);

drop policy if exists "manager writes own quizzes" on quizzes;
create policy "manager writes own quizzes" on quizzes for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = quizzes.brand_id)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = quizzes.brand_id)
  );

drop policy if exists "manager writes own quiz_products" on quiz_products;
create policy "manager writes own quiz_products" on quiz_products for all
  using (exists (
    select 1 from quizzes qz
    where qz.id = quiz_products.quiz_id and (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = qz.brand_id)
    )
  ))
  with check (exists (
    select 1 from quizzes qz
    where qz.id = quiz_products.quiz_id and (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = qz.brand_id)
    )
  ));
drop policy if exists "public read quiz_questions" on quiz_questions;
create policy "public read quiz_questions" on quiz_questions for select using (true);
drop policy if exists "public read quiz_answers" on quiz_answers;
create policy "public read quiz_answers" on quiz_answers for select using (true);

drop policy if exists "manager writes own quiz_questions" on quiz_questions;
create policy "manager writes own quiz_questions" on quiz_questions for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = quiz_questions.brand_id)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = quiz_questions.brand_id)
  );

drop policy if exists "manager writes own quiz_answers" on quiz_answers;
create policy "manager writes own quiz_answers" on quiz_answers for all
  using (exists (
    select 1 from quiz_questions qq
    where qq.id = quiz_answers.question_id and (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = qq.brand_id)
    )
  ))
  with check (exists (
    select 1 from quiz_questions qq
    where qq.id = quiz_answers.question_id and (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from brand_members where user_id = auth.uid() and brand_id = qq.brand_id)
    )
  ));

-- Traffic / funnel events. brand_id is denormalized onto every row so the
-- stats report queries by it directly and stays attributable even if the
-- underlying question or product is later edited or removed.
create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists quiz_sessions_brand_id_idx on quiz_sessions(brand_id);
-- Which quiz the visitor opened. Set null if that quiz is later deleted, so
-- the session still counts toward the company's totals.
alter table quiz_sessions add column if not exists quiz_id uuid references quizzes(id) on delete set null;

create table if not exists quiz_results (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  session_id uuid references quiz_sessions(id) on delete set null,
  recommended_product_id uuid references products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_results_brand_id_idx on quiz_results(brand_id);

create table if not exists product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  source text not null default 'web' check (source in ('web','qr')),
  viewed_at timestamptz not null default now()
);
create index if not exists product_views_brand_id_idx on product_views(brand_id);
create index if not exists product_views_product_id_idx on product_views(product_id);

create table if not exists product_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  source text not null default 'web' check (source in ('web','qr')),
  clicked_at timestamptz not null default now()
);
create index if not exists product_clicks_brand_id_idx on product_clicks(brand_id);

-- No public read policy on any of the four tables above — this is the
-- company's own business data. Visitor events are written by service_role
-- API routes with no session requirement (visitors are anonymous),
-- validated by shape and by the FK constraints; reads go through the
-- ownership-checked stats route.
alter table quiz_sessions enable row level security;
alter table quiz_results enable row level security;
alter table product_views enable row level security;
alter table product_clicks enable row level security;

-- Per-product stats rollup, aggregated in Postgres.
--
-- Counting in the route handler from raw event rows silently caps at 1000
-- (PostgREST's default row limit): 1200 views report as 1000, no error.
-- Aggregating here returns one row per product instead of one per event.
--
-- SECURITY INVOKER (the default — deliberately NOT `security definer`):
-- PostgREST exposes every function as an RPC endpoint callable with the
-- anon key. As invoker, RLS still applies to the caller, and these tables
-- have no public read policy — an anon caller gets nothing back, while the
-- service_role client used by the route gets the real numbers.
create or replace function brand_stats(p_brand_id uuid)
returns table (
  product_id uuid,
  views bigint,
  web_views bigint,
  qr_views bigint,
  clicks bigint,
  recommended bigint
)
language sql
stable
as $$
  with ids as (
    select product_id from product_views where brand_id = p_brand_id
    union
    select product_id from product_clicks where brand_id = p_brand_id
    union
    select recommended_product_id from quiz_results
      where brand_id = p_brand_id and recommended_product_id is not null
  ),
  v as (
    select pv.product_id,
           count(*) as views,
           count(*) filter (where pv.source = 'web') as web_views,
           count(*) filter (where pv.source = 'qr') as qr_views
    from product_views pv
    where pv.brand_id = p_brand_id
    group by pv.product_id
  ),
  c as (
    select pc.product_id, count(*) as clicks
    from product_clicks pc
    where pc.brand_id = p_brand_id
    group by pc.product_id
  ),
  r as (
    select qr.recommended_product_id as product_id, count(*) as recommended
    from quiz_results qr
    where qr.brand_id = p_brand_id and qr.recommended_product_id is not null
    group by qr.recommended_product_id
  )
  select
    i.product_id,
    coalesce(v.views, 0),
    coalesce(v.web_views, 0),
    coalesce(v.qr_views, 0),
    coalesce(c.clicks, 0),
    coalesce(r.recommended, 0)
  from ids i
  left join v on v.product_id = i.product_id
  left join c on c.product_id = i.product_id
  left join r on r.product_id = i.product_id;
$$;

-- Tell PostgREST (Supabase's REST layer) to pick up new tables and columns
-- right away, so the site doesn't briefly report a table as missing.
notify pgrst, 'reload schema';
