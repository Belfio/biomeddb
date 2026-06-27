# biomeddb MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a searchable, community-curated catalog of biomedical datasets where users find data by modality + linked disease/outcome/marker, vote on quality, and contribute entries — with seeded ECG (PhysioNet) and skin-lesion (ISIC) content.

**Architecture:** Next.js (App Router, TS) on Vercel as a single full-stack app talking directly to Supabase Postgres via `@supabase/ssr`. Postgres holds the catalog, a controlled concept vocabulary with synonyms, and votes; triggers maintain denormalized scores and a full-text `tsvector`. Pure domain logic (validation, synonym resolution, ranking) is isolated for unit testing; DB behavior (triggers, RLS, search) is integration-tested against a local Supabase stack.

**Tech Stack:** Next.js 15 / React 19 / TypeScript 5 (strict), Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js` v2 + `@supabase/ssr`, Zod, Vitest, Tailwind, Vercel.

## Global Constraints

- Node ≥ 20; package manager: `npm`.
- TypeScript `strict: true`; no `any` in committed code unless justified inline.
- All DB schema changes are SQL files under `supabase/migrations/` applied via `supabase db reset` (local) / `supabase db push` (cloud). Never hand-edit the DB.
- Row Level Security (RLS) **enabled on every table**; default deny, explicit policies.
- Public read is allowed for catalog tables; all writes require `auth.uid()`; status changes require moderator role.
- Money/PHI: never store patient-identifiable data; `hosted` files require a redistribution-permitting `license`.
- Unit tests run with `npm test` (Vitest, no external services). Integration tests run with `npm run test:int` and require `supabase start` (local Docker stack); they are skipped when `SUPABASE_URL` is unset.
- Conventional commits (`feat:`, `test:`, `chore:`, `fix:`). Commit after every green step group.
- Enum string values are canonical and copied verbatim everywhere:
  - `host_type`: `linked` | `hosted`
  - `access_level`: `open` | `registration` | `data-use-agreement`
  - `dataset_status`: `unverified` | `verified` | `flagged`
  - `concept_kind`: `disease` | `outcome` | `marker`
  - `relationship_type`: `studies` | `outcome` | `marker`
  - `vote_target`: `dataset` | `dataset_concept`

---

## File Structure

```
biomeddb/
├─ app/
│  ├─ layout.tsx                  # root layout, nav, auth status
│  ├─ page.tsx                    # search page (server component)
│  ├─ datasets/[id]/page.tsx      # dataset detail
│  ├─ contribute/page.tsx         # add-dataset form (auth-gated)
│  ├─ login/page.tsx              # Supabase auth UI
│  └─ actions/                    # server actions (mutations)
│     ├─ datasets.ts              # createDataset, setStatus
│     └─ votes.ts                 # castVote
├─ components/
│  ├─ SearchBar.tsx
│  ├─ Filters.tsx
│  ├─ DatasetCard.tsx
│  ├─ VoteButtons.tsx
│  ├─ ConceptChips.tsx
│  └─ ConceptAutocomplete.tsx
├─ lib/
│  ├─ types.ts                    # shared TS types mirroring DB enums/rows
│  ├─ validation.ts               # Zod schemas
│  ├─ concepts.ts                 # synonym resolution (pure)
│  ├─ ranking.ts                  # ranking blend (pure)
│  ├─ search-params.ts            # parse/serialize search filters (pure)
│  └─ supabase/
│     ├─ client.ts                # browser client
│     ├─ server.ts                # server (RSC/action) client
│     └─ admin.ts                 # service-role client (server-only)
├─ lib/queries/
│  ├─ search.ts                   # searchDatasets
│  ├─ datasets.ts                 # getDataset, createDataset, setStatus
│  ├─ votes.ts                    # castVote
│  └─ concepts.ts                 # autocompleteConcepts, proposeConcept
├─ supabase/migrations/
│  ├─ 0001_enums.sql
│  ├─ 0002_tables.sql
│  ├─ 0003_scores_trigger.sql
│  ├─ 0004_search_tsv.sql
│  ├─ 0005_profiles_and_rls.sql
│  └─ 0006_search_rpc.sql
├─ scripts/seed.ts               # PhysioNet + ISIC seed
├─ tests/                        # unit (*.test.ts) + integration (*.int.test.ts)
├─ middleware.ts                 # refresh Supabase session cookies
├─ vitest.config.ts
└─ .env.local                    # SUPABASE_URL, keys (gitignored)
```

Split rationale: pure logic (`lib/*.ts`) is framework-free and unit-tested; DB access (`lib/queries/*`) is the only place that talks to Supabase; UI never calls Supabase directly except through actions/queries.

---

## Milestone 0 — Scaffold

### Task 1: Initialize app + test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `lib/sanity.ts`
- Test: `tests/sanity.test.ts`

**Interfaces:**
- Produces: `add(a:number,b:number):number` in `lib/sanity.ts` (placeholder proving the test loop; deleted in Task 7).

- [ ] **Step 1: Scaffold Next.js app**

Run:
```bash
npx create-next-app@latest . --ts --app --eslint --tailwind --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
npm install zod @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/**/*.int.test.ts'],
  },
})
```

Add scripts to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:int": "vitest run --config vitest.int.config.ts"
}
```

- [ ] **Step 3: Write the failing test**

Create `lib/sanity.ts`:
```ts
export function add(a: number, b: number): number {
  throw new Error('not implemented')
}
```
Create `tests/sanity.test.ts`:
```ts
import { expect, test } from 'vitest'
import { add } from '@/lib/sanity'

test('add sums two numbers', () => {
  expect(add(2, 3)).toBe(5)
})
```

- [ ] **Step 4: Run test, verify FAIL**

Run: `npm test`
Expected: FAIL ("not implemented").

- [ ] **Step 5: Implement, verify PASS**

Edit `lib/sanity.ts`: `return a + b`.
Run: `npm test` → PASS.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: scaffold next.js app with vitest"
```

---

### Task 2: Local Supabase + integration harness

**Files:**
- Create: `supabase/config.toml` (via CLI), `vitest.int.config.ts`, `tests/helpers/db.ts`, `.env.local.example`

**Interfaces:**
- Produces: `getAdminClient(): SupabaseClient` and `resetDb(): Promise<void>` in `tests/helpers/db.ts` for integration tests.

- [ ] **Step 1: Init Supabase locally**
```bash
npx supabase init
npx supabase start   # prints API URL + anon/service_role keys
```
Copy the printed values into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service_role>
```
Create `.env.local.example` with the same keys and empty values. Ensure `.env.local` is gitignored.

- [ ] **Step 2: Integration vitest config**

Create `vitest.int.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.int.test.ts'],
    setupFiles: ['tests/helpers/load-env.ts'],
    testTimeout: 20000,
  },
})
```
Create `tests/helpers/load-env.ts`:
```ts
import { config } from 'dotenv'
config({ path: '.env.local' })
```
Run `npm i -D dotenv`.

- [ ] **Step 3: DB helper**

Create `tests/helpers/db.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}
```

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore: local supabase + integration test harness"
```

---

## Milestone 1 — Data layer

### Task 3: Enums + core tables

**Files:**
- Create: `supabase/migrations/0001_enums.sql`, `supabase/migrations/0002_tables.sql`
- Test: `tests/db/schema.int.test.ts`

**Interfaces:**
- Produces tables: `modalities`, `concepts`, `datasets`, `dataset_concepts`, `votes`, `dataset_edits` with columns exactly as in the spec §4.

- [ ] **Step 1: Write enums migration**

Create `supabase/migrations/0001_enums.sql`:
```sql
create type host_type as enum ('linked', 'hosted');
create type access_level as enum ('open', 'registration', 'data-use-agreement');
create type dataset_status as enum ('unverified', 'verified', 'flagged');
create type concept_kind as enum ('disease', 'outcome', 'marker');
create type relationship_type as enum ('studies', 'outcome', 'marker');
create type vote_target as enum ('dataset', 'dataset_concept');
```

- [ ] **Step 2: Write tables migration**

Create `supabase/migrations/0002_tables.sql`:
```sql
create extension if not exists "pgcrypto";

create table modalities (
  slug text primary key,
  name text not null,
  category text not null
);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  synonyms text[] not null default '{}',
  kind concept_kind not null,
  mesh_code text,
  icd_code text,
  created_at timestamptz not null default now()
);

create table datasets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  modality text not null references modalities(slug),
  source_name text not null,
  source_url text not null,
  host_type host_type not null default 'linked',
  file_path text,
  license text not null,
  access access_level not null default 'open',
  n_subjects int,
  format text,
  submitted_by uuid references auth.users(id),
  status dataset_status not null default 'unverified',
  score int not null default 0,
  search_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dataset_concepts (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  relationship relationship_type not null,
  proposed_by uuid references auth.users(id),
  score int not null default 0,
  created_at timestamptz not null default now(),
  unique (dataset_id, concept_id, relationship)
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  target_type vote_target not null,
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table dataset_edits (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  editor_id uuid references auth.users(id),
  diff jsonb not null,
  created_at timestamptz not null default now()
);

create index datasets_modality_idx on datasets(modality);
create index dataset_concepts_dataset_idx on dataset_concepts(dataset_id);
create index dataset_concepts_concept_idx on dataset_concepts(concept_id);
```

- [ ] **Step 3: Write failing integration test**

Create `tests/db/schema.int.test.ts`:
```ts
import { beforeAll, expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'

const db = getAdminClient()

test('core tables exist and accept a linked dataset', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data, error } = await db
    .from('datasets')
    .insert({
      title: 'Test DS', modality: 'ecg', source_name: 'X',
      source_url: 'https://x', license: 'CC0-1.0',
    })
    .select('id, status, score')
    .single()
  expect(error).toBeNull()
  expect(data!.status).toBe('unverified')
  expect(data!.score).toBe(0)
})
```

- [ ] **Step 4: Apply migrations, run test**

Run:
```bash
npx supabase db reset   # applies all migrations to local db
npm run test:int -- tests/db/schema.int.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: core schema (enums + tables)"
```

---

### Task 4: Vote-score trigger

**Files:**
- Create: `supabase/migrations/0003_scores_trigger.sql`
- Test: `tests/db/scores.int.test.ts`

**Interfaces:**
- Produces: DB trigger keeping `datasets.score` and `dataset_concepts.score` equal to `sum(votes.value)` for matching `target_type/target_id`.

- [ ] **Step 1: Write failing integration test**

Create `tests/db/scores.int.test.ts`:
```ts
import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
const db = getAdminClient()

test('voting updates denormalized dataset score', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'S', modality: 'ecg', source_name: 'X', source_url: 'https://x', license: 'CC0-1.0' })
    .select('id').single()
  const { data: user } = await db.auth.admin.createUser({ email: `u${Date.now()}@t.co`, password: 'pw123456', email_confirm: true })
  await db.from('votes').insert({ user_id: user!.user!.id, target_type: 'dataset', target_id: ds!.id, value: 1 })
  const { data: after } = await db.from('datasets').select('score').eq('id', ds!.id).single()
  expect(after!.score).toBe(1)
})
```

- [ ] **Step 2: Run test, verify FAIL** (`score` stays 0).
Run: `npm run test:int -- tests/db/scores.int.test.ts` → FAIL.

- [ ] **Step 3: Write the trigger migration**

Create `supabase/migrations/0003_scores_trigger.sql`:
```sql
create or replace function apply_vote_score() returns trigger
language plpgsql as $$
declare
  tgt_type vote_target;
  tgt_id uuid;
  delta int;
begin
  if (tg_op = 'DELETE') then
    tgt_type := old.target_type; tgt_id := old.target_id; delta := -old.value;
  elsif (tg_op = 'UPDATE') then
    tgt_type := new.target_type; tgt_id := new.target_id; delta := new.value - old.value;
  else
    tgt_type := new.target_type; tgt_id := new.target_id; delta := new.value;
  end if;

  if tgt_type = 'dataset' then
    update datasets set score = score + delta where id = tgt_id;
  else
    update dataset_concepts set score = score + delta where id = tgt_id;
  end if;
  return null;
end $$;

create trigger votes_score_aiud
after insert or update or delete on votes
for each row execute function apply_vote_score();
```

- [ ] **Step 4: Apply + run test → PASS**
```bash
npx supabase db reset
npm run test:int -- tests/db/scores.int.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: vote-score trigger"
```

---

### Task 5: Full-text `search_tsv` + search RPC

**Files:**
- Create: `supabase/migrations/0004_search_tsv.sql`, `supabase/migrations/0006_search_rpc.sql`
- Test: `tests/db/search.int.test.ts`

**Interfaces:**
- Produces: trigger maintaining `datasets.search_tsv` from title + description + linked concept names; Postgres RPC `search_datasets(q text, p_modality text, p_access access_level, p_hosted_only bool, p_limit int, p_offset int)` returning ranked dataset rows.

- [ ] **Step 1: Write failing integration test**

Create `tests/db/search.int.test.ts`:
```ts
import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
const db = getAdminClient()

test('search finds dataset by linked concept synonym text', async () => {
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: c } = await db.from('concepts')
    .insert({ name: 'Sudden cardiac death', slug: `scd-${Date.now()}`, kind: 'disease', synonyms: ['SADS'] })
    .select('id').single()
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'Holter recordings', description: 'ambulatory ECG', modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/', license: 'ODC-By-1.0', status: 'verified' })
    .select('id').single()
  await db.from('dataset_concepts').insert({ dataset_id: ds!.id, concept_id: c!.id, relationship: 'studies' })

  const { data, error } = await db.rpc('search_datasets', {
    q: 'sudden cardiac death', p_modality: 'ecg', p_access: null, p_hosted_only: false, p_limit: 20, p_offset: 0,
  })
  expect(error).toBeNull()
  expect(data!.map((r: any) => r.id)).toContain(ds!.id)
})
```

- [ ] **Step 2: Run → FAIL** (rpc missing). `npm run test:int -- tests/db/search.int.test.ts`

- [ ] **Step 3: Write tsv trigger migration**

Create `supabase/migrations/0004_search_tsv.sql`:
```sql
create or replace function refresh_dataset_tsv(p_dataset_id uuid) returns void
language sql as $$
  update datasets d set search_tsv =
    setweight(to_tsvector('english', coalesce(d.title,'')), 'A')
    || setweight(to_tsvector('english', coalesce(d.description,'')), 'C')
    || setweight(to_tsvector('english', coalesce((
        select string_agg(c.name || ' ' || array_to_string(c.synonyms, ' '), ' ')
        from dataset_concepts dc join concepts c on c.id = dc.concept_id
        where dc.dataset_id = d.id), '')), 'B')
  where d.id = p_dataset_id;
$$;

create or replace function datasets_tsv_self() returns trigger
language plpgsql as $$
begin
  perform refresh_dataset_tsv(new.id);
  return null;
end $$;

create trigger datasets_tsv_aiu
after insert or update of title, description on datasets
for each row execute function datasets_tsv_self();

create or replace function dataset_concepts_tsv() returns trigger
language plpgsql as $$
begin
  perform refresh_dataset_tsv(coalesce(new.dataset_id, old.dataset_id));
  return null;
end $$;

create trigger dataset_concepts_tsv_aid
after insert or delete on dataset_concepts
for each row execute function dataset_concepts_tsv();

create index datasets_tsv_idx on datasets using gin(search_tsv);
```

- [ ] **Step 4: Write search RPC migration**

Create `supabase/migrations/0006_search_rpc.sql`:
```sql
create or replace function search_datasets(
  q text,
  p_modality text default null,
  p_access access_level default null,
  p_hosted_only boolean default false,
  p_limit int default 20,
  p_offset int default 0
) returns setof datasets
language sql stable as $$
  select d.*
  from datasets d
  where (q is null or q = '' or d.search_tsv @@ websearch_to_tsquery('english', q))
    and (p_modality is null or d.modality = p_modality)
    and (p_access is null or d.access = p_access)
    and (not p_hosted_only or d.host_type = 'hosted')
  order by
    (case when q is null or q = '' then 0
          else ts_rank(d.search_tsv, websearch_to_tsquery('english', q)) end) * 10
    + d.score
    + (case when d.status = 'verified' then 2 else 0 end) desc,
    d.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;
```

- [ ] **Step 5: Apply + run → PASS**
```bash
npx supabase db reset
npm run test:int -- tests/db/search.int.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: full-text tsv triggers + search_datasets rpc"
```

---

### Task 6: Profiles, moderator role, RLS

**Files:**
- Create: `supabase/migrations/0005_profiles_and_rls.sql`
- Test: `tests/db/rls.int.test.ts`

**Interfaces:**
- Produces: `profiles(id, role)` with auto-insert on signup; `is_moderator(uuid)` helper; RLS policies — public select on catalog tables; authenticated insert on `datasets`/`dataset_concepts`/`votes` (owner-bound); status updates moderator-only.

> Note: migration is numbered 0005 but depends only on tables (0002); ordering is fine because reset applies in filename order and 0003/0004 don't touch these policies.

- [ ] **Step 1: Write failing integration test**

Create `tests/db/rls.int.test.ts`:
```ts
import { expect, test } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '../helpers/db'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

test('anonymous cannot insert datasets but can read them', async () => {
  const admin = getAdminClient()
  await admin.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const anonClient = createClient(url, anon, { auth: { persistSession: false } })
  const { error: insErr } = await anonClient.from('datasets')
    .insert({ title: 'nope', modality: 'ecg', source_name: 'x', source_url: 'https://x', license: 'CC0-1.0' })
  expect(insErr).not.toBeNull()
  const { error: selErr } = await anonClient.from('datasets').select('id').limit(1)
  expect(selErr).toBeNull()
})
```

- [ ] **Step 2: Run → FAIL** (RLS not enabled, insert succeeds).

- [ ] **Step 3: Write profiles + RLS migration**

Create `supabase/migrations/0005_profiles_and_rls.sql`:
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

create or replace function is_moderator(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role = 'moderator');
$$;

alter table modalities enable row level security;
alter table concepts enable row level security;
alter table datasets enable row level security;
alter table dataset_concepts enable row level security;
alter table votes enable row level security;
alter table dataset_edits enable row level security;
alter table profiles enable row level security;

-- public read
create policy read_modalities on modalities for select using (true);
create policy read_concepts on concepts for select using (true);
create policy read_datasets on datasets for select using (true);
create policy read_dc on dataset_concepts for select using (true);
create policy read_votes on votes for select using (true);
create policy read_profiles on profiles for select using (true);

-- concepts: any authenticated user may propose
create policy ins_concepts on concepts for insert to authenticated with check (true);

-- datasets: authenticated insert, must own row
create policy ins_datasets on datasets for insert to authenticated
  with check (submitted_by = auth.uid());
-- owners edit own non-status fields; moderators edit anything
create policy upd_datasets on datasets for update to authenticated
  using (submitted_by = auth.uid() or is_moderator(auth.uid()))
  with check (
    is_moderator(auth.uid())
    or (submitted_by = auth.uid() and status = (select status from datasets d2 where d2.id = datasets.id))
  );

-- dataset_concepts: authenticated propose, owner-bound
create policy ins_dc on dataset_concepts for insert to authenticated
  with check (proposed_by = auth.uid());

-- votes: owner-bound CRUD
create policy ins_votes on votes for insert to authenticated with check (user_id = auth.uid());
create policy upd_votes on votes for update to authenticated using (user_id = auth.uid());
create policy del_votes on votes for delete to authenticated using (user_id = auth.uid());

-- edits: authenticated insert
create policy ins_edits on dataset_edits for insert to authenticated with check (editor_id = auth.uid());
```

- [ ] **Step 4: Apply + run → PASS**
```bash
npx supabase db reset
npm run test:int -- tests/db/rls.int.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: profiles, moderator role, RLS policies"
```

---

## Milestone 2 — Pure domain logic (unit-tested, no DB)

### Task 7: Shared types + Zod validation

**Files:**
- Create: `lib/types.ts`, `lib/validation.ts`
- Delete: `lib/sanity.ts`, `tests/sanity.test.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Produces: TS types `HostType, AccessLevel, DatasetStatus, ConceptKind, RelationshipType` (string unions matching enums); `DatasetInput` type; `datasetInputSchema`, `voteSchema`, `conceptProposalSchema` (Zod). `datasetInputSchema.parse(x): DatasetInput`.

- [ ] **Step 1: Write the failing test**

Create `tests/validation.test.ts`:
```ts
import { expect, test } from 'vitest'
import { datasetInputSchema } from '@/lib/validation'

const valid = {
  title: 'X', description: '', modality: 'ecg', sourceName: 'PhysioNet',
  sourceUrl: 'https://physionet.org/content/sddb/', hostType: 'linked',
  license: 'ODC-By-1.0', access: 'open',
  concepts: [{ conceptId: '11111111-1111-1111-1111-111111111111', relationship: 'studies' }],
}

test('accepts a valid linked dataset', () => {
  expect(datasetInputSchema.parse(valid).title).toBe('X')
})

test('rejects hosted dataset without a license', () => {
  expect(() => datasetInputSchema.parse({ ...valid, hostType: 'hosted', license: '' })).toThrow()
})

test('rejects non-url source', () => {
  expect(() => datasetInputSchema.parse({ ...valid, sourceUrl: 'not-a-url' })).toThrow()
})
```

- [ ] **Step 2: Run → FAIL**. `npm test`

- [ ] **Step 3: Implement types + schema**

Create `lib/types.ts`:
```ts
export type HostType = 'linked' | 'hosted'
export type AccessLevel = 'open' | 'registration' | 'data-use-agreement'
export type DatasetStatus = 'unverified' | 'verified' | 'flagged'
export type ConceptKind = 'disease' | 'outcome' | 'marker'
export type RelationshipType = 'studies' | 'outcome' | 'marker'
export type VoteTarget = 'dataset' | 'dataset_concept'

export interface DatasetConceptLink { conceptId: string; relationship: RelationshipType }
export interface DatasetInput {
  title: string; description: string; modality: string
  sourceName: string; sourceUrl: string; hostType: HostType
  license: string; access: AccessLevel
  nSubjects?: number; format?: string
  concepts: DatasetConceptLink[]
}
```

Create `lib/validation.ts`:
```ts
import { z } from 'zod'

export const relationshipEnum = z.enum(['studies', 'outcome', 'marker'])

export const datasetInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).default(''),
  modality: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  hostType: z.enum(['linked', 'hosted']),
  license: z.string().default(''),
  access: z.enum(['open', 'registration', 'data-use-agreement']),
  nSubjects: z.number().int().positive().optional(),
  format: z.string().optional(),
  concepts: z.array(z.object({ conceptId: z.string().uuid(), relationship: relationshipEnum })).min(1),
}).refine((d) => d.hostType !== 'hosted' || d.license.trim().length > 0, {
  message: 'Hosted datasets require a redistribution-permitting license', path: ['license'],
})

export const voteSchema = z.object({
  targetType: z.enum(['dataset', 'dataset_concept']),
  targetId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export const conceptProposalSchema = z.object({
  name: z.string().min(2).max(200),
  kind: z.enum(['disease', 'outcome', 'marker']),
  synonyms: z.array(z.string()).default([]),
})
```

- [ ] **Step 4: Delete placeholder + run → PASS**
```bash
rm lib/sanity.ts tests/sanity.test.ts
npm test
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: shared types + zod validation"
```

---

### Task 8: Concept synonym resolution (pure)

**Files:**
- Create: `lib/concepts.ts`
- Test: `tests/concepts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `normalizeTerm(s: string): string`; `matchConcepts(term: string, concepts: ConceptLike[]): ConceptLike[]` where `ConceptLike = { id: string; name: string; synonyms: string[] }`. Matches case-insensitively against name or any synonym (exact-token or substring).

- [ ] **Step 1: Write the failing test**

Create `tests/concepts.test.ts`:
```ts
import { expect, test } from 'vitest'
import { matchConcepts, normalizeTerm } from '@/lib/concepts'

const concepts = [
  { id: '1', name: 'Sudden cardiac death', synonyms: ['SADS', 'sudden death syndrome', 'SCD'] },
  { id: '2', name: 'Melanoma', synonyms: ['cutaneous melanoma', 'malignant melanoma'] },
]

test('normalizeTerm lowercases and trims', () => {
  expect(normalizeTerm('  Sudden Death  ')).toBe('sudden death')
})

test('matches a concept by synonym', () => {
  expect(matchConcepts('sudden death syndrome', concepts).map(c => c.id)).toEqual(['1'])
})

test('matches by canonical name case-insensitively', () => {
  expect(matchConcepts('MELANOMA', concepts).map(c => c.id)).toEqual(['2'])
})

test('no match returns empty', () => {
  expect(matchConcepts('diabetes', concepts)).toEqual([])
})
```

- [ ] **Step 2: Run → FAIL**. `npm test`

- [ ] **Step 3: Implement**

Create `lib/concepts.ts`:
```ts
export interface ConceptLike { id: string; name: string; synonyms: string[] }

export function normalizeTerm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchConcepts(term: string, concepts: ConceptLike[]): ConceptLike[] {
  const t = normalizeTerm(term)
  if (!t) return []
  return concepts.filter((c) => {
    const hay = [c.name, ...c.synonyms].map(normalizeTerm)
    return hay.some((h) => h === t || h.includes(t) || t.includes(h))
  })
}
```

- [ ] **Step 4: Run → PASS**. `npm test`

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: concept synonym resolution"
```

---

### Task 9: Search params parsing + ranking (pure)

**Files:**
- Create: `lib/search-params.ts`, `lib/ranking.ts`
- Test: `tests/search-params.test.ts`, `tests/ranking.test.ts`

**Interfaces:**
- Produces: `parseSearchParams(sp: Record<string,string|string[]|undefined>): SearchFilters` where `SearchFilters = { q: string; modality: string | null; access: AccessLevel | null; hostedOnly: boolean; page: number }`; `toQueryString(f: SearchFilters): string`; `rankScore(tsRank: number, voteScore: number, verified: boolean): number`.

- [ ] **Step 1: Write the failing tests**

Create `tests/search-params.test.ts`:
```ts
import { expect, test } from 'vitest'
import { parseSearchParams, toQueryString } from '@/lib/search-params'

test('parses defaults', () => {
  expect(parseSearchParams({})).toEqual({ q: '', modality: null, access: null, hostedOnly: false, page: 1 })
})

test('parses provided values', () => {
  expect(parseSearchParams({ q: 'ecg', modality: 'ecg', access: 'open', hosted: '1', page: '2' }))
    .toEqual({ q: 'ecg', modality: 'ecg', access: 'open', hostedOnly: true, page: 2 })
})

test('drops invalid access', () => {
  expect(parseSearchParams({ access: 'bogus' }).access).toBeNull()
})

test('round-trips through query string', () => {
  const f = { q: 'mole', modality: null, access: null, hostedOnly: true, page: 1 }
  expect(parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(f))))).toEqual(f)
})
```

Create `tests/ranking.test.ts`:
```ts
import { expect, test } from 'vitest'
import { rankScore } from '@/lib/ranking'

test('verified datasets get a boost', () => {
  expect(rankScore(0.5, 3, true)).toBeGreaterThan(rankScore(0.5, 3, false))
})
test('higher text rank wins ties on votes', () => {
  expect(rankScore(0.9, 1, false)).toBeGreaterThan(rankScore(0.1, 1, false))
})
```

- [ ] **Step 2: Run → FAIL**. `npm test`

- [ ] **Step 3: Implement**

Create `lib/search-params.ts`:
```ts
import type { AccessLevel } from './types'

export interface SearchFilters {
  q: string; modality: string | null; access: AccessLevel | null
  hostedOnly: boolean; page: number
}

const ACCESS: AccessLevel[] = ['open', 'registration', 'data-use-agreement']
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const access = first(sp.access) as AccessLevel
  const page = parseInt(first(sp.page), 10)
  return {
    q: first(sp.q).trim(),
    modality: first(sp.modality) || null,
    access: ACCESS.includes(access) ? access : null,
    hostedOnly: first(sp.hosted) === '1',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toQueryString(f: SearchFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.modality) p.set('modality', f.modality)
  if (f.access) p.set('access', f.access)
  if (f.hostedOnly) p.set('hosted', '1')
  if (f.page > 1) p.set('page', String(f.page))
  return p.toString()
}
```

Create `lib/ranking.ts`:
```ts
export function rankScore(tsRank: number, voteScore: number, verified: boolean): number {
  return tsRank * 10 + voteScore + (verified ? 2 : 0)
}
```

- [ ] **Step 4: Run → PASS**. `npm test`

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: search params + ranking helpers"
```

---

## Milestone 3 — Data access + server actions

### Task 10: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `middleware.ts`

**Interfaces:**
- Produces: `createBrowserClient()` (client.ts default export `createClient`), `createServerClient()` in server.ts (async, reads cookies), `createAdminClient()` in admin.ts (service role, server-only). `middleware.ts` refreshes the auth session.

- [ ] **Step 1: Browser client**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: Server client**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* RSC read-only */ }
        },
      },
    },
  )
}
```

- [ ] **Step 3: Admin client**

Create `lib/supabase/admin.ts`:
```ts
import 'server-only'
import { createClient as createSb } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
```
Run `npm i server-only`.

- [ ] **Step 4: Middleware**

Create `middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  await supabase.auth.getUser()
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 5: Typecheck + commit**
```bash
npx tsc --noEmit
git add -A && git commit -m "feat: supabase browser/server/admin clients + middleware"
```

---

### Task 11: Query functions

**Files:**
- Create: `lib/queries/search.ts`, `lib/queries/datasets.ts`, `lib/queries/votes.ts`, `lib/queries/concepts.ts`
- Test: `tests/queries/search.int.test.ts`

**Interfaces:**
- Consumes: `createAdminClient`/`createClient` (server), `search_datasets` RPC, `SearchFilters`, `DatasetInput`.
- Produces:
  - `searchDatasets(sb, filters: SearchFilters, pageSize=20): Promise<DatasetRow[]>`
  - `getDataset(sb, id: string): Promise<DatasetDetail | null>` (dataset + linked concepts)
  - `createDataset(sb, input: DatasetInput, userId: string): Promise<string>` (returns new id)
  - `castVote(sb, userId, targetType, targetId, value): Promise<void>` (upsert/toggle)
  - `autocompleteConcepts(sb, term: string): Promise<ConceptLike[]>`
  - `setDatasetStatus(sb, id, status): Promise<void>`
- Types added to `lib/types.ts`: `DatasetRow` (DB row shape) and `DatasetDetail = DatasetRow & { concepts: LinkedConcept[] }`, `LinkedConcept = { id, name, relationship, score, conceptId }`.

- [ ] **Step 1: Extend `lib/types.ts`**
```ts
export interface DatasetRow {
  id: string; title: string; description: string; modality: string
  source_name: string; source_url: string; host_type: HostType
  file_path: string | null; license: string; access: AccessLevel
  n_subjects: number | null; format: string | null
  status: DatasetStatus; score: number; created_at: string
}
export interface LinkedConcept { id: string; conceptId: string; name: string; relationship: RelationshipType; score: number }
export interface DatasetDetail extends DatasetRow { concepts: LinkedConcept[] }
```

- [ ] **Step 2: Write failing integration test**

Create `tests/queries/search.int.test.ts`:
```ts
import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
import { searchDatasets } from '@/lib/queries/search'

test('searchDatasets returns rows matching filters', async () => {
  const db = getAdminClient()
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  await db.from('datasets').insert({
    title: 'Holter SCD set', description: 'ECG sudden cardiac death',
    modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/',
    license: 'ODC-By-1.0', status: 'verified',
  })
  const rows = await searchDatasets(db, { q: 'sudden cardiac death', modality: 'ecg', access: null, hostedOnly: false, page: 1 })
  expect(rows.length).toBeGreaterThan(0)
  expect(rows[0].modality).toBe('ecg')
})
```

- [ ] **Step 3: Run → FAIL**. `npm run test:int -- tests/queries/search.int.test.ts`

- [ ] **Step 4: Implement queries**

Create `lib/queries/search.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatasetRow } from '@/lib/types'
import type { SearchFilters } from '@/lib/search-params'

export async function searchDatasets(sb: SupabaseClient, f: SearchFilters, pageSize = 20): Promise<DatasetRow[]> {
  const { data, error } = await sb.rpc('search_datasets', {
    q: f.q, p_modality: f.modality, p_access: f.access,
    p_hosted_only: f.hostedOnly, p_limit: pageSize, p_offset: (f.page - 1) * pageSize,
  })
  if (error) throw error
  return (data ?? []) as DatasetRow[]
}
```

Create `lib/queries/datasets.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatasetDetail, DatasetInput, DatasetStatus, LinkedConcept } from '@/lib/types'

export async function getDataset(sb: SupabaseClient, id: string): Promise<DatasetDetail | null> {
  const { data: ds } = await sb.from('datasets').select('*').eq('id', id).maybeSingle()
  if (!ds) return null
  const { data: links } = await sb
    .from('dataset_concepts')
    .select('id, concept_id, relationship, score, concepts(name)')
    .eq('dataset_id', id)
  const concepts: LinkedConcept[] = (links ?? []).map((l: any) => ({
    id: l.id, conceptId: l.concept_id, name: l.concepts?.name ?? '', relationship: l.relationship, score: l.score,
  }))
  return { ...(ds as any), concepts }
}

export async function createDataset(sb: SupabaseClient, input: DatasetInput, userId: string): Promise<string> {
  const { data, error } = await sb.from('datasets').insert({
    title: input.title, description: input.description, modality: input.modality,
    source_name: input.sourceName, source_url: input.sourceUrl, host_type: input.hostType,
    license: input.license, access: input.access, n_subjects: input.nSubjects ?? null,
    format: input.format ?? null, submitted_by: userId,
  }).select('id').single()
  if (error) throw error
  const datasetId = data!.id as string
  const rows = input.concepts.map((c) => ({
    dataset_id: datasetId, concept_id: c.conceptId, relationship: c.relationship, proposed_by: userId,
  }))
  const { error: linkErr } = await sb.from('dataset_concepts').insert(rows)
  if (linkErr) throw linkErr
  return datasetId
}

export async function setDatasetStatus(sb: SupabaseClient, id: string, status: DatasetStatus): Promise<void> {
  const { error } = await sb.from('datasets').update({ status }).eq('id', id)
  if (error) throw error
}
```

Create `lib/queries/votes.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VoteTarget } from '@/lib/types'

export async function castVote(
  sb: SupabaseClient, userId: string, targetType: VoteTarget, targetId: string, value: 1 | -1,
): Promise<void> {
  const { data: existing } = await sb.from('votes').select('id, value')
    .eq('user_id', userId).eq('target_type', targetType).eq('target_id', targetId).maybeSingle()
  if (!existing) {
    const { error } = await sb.from('votes').insert({ user_id: userId, target_type: targetType, target_id: targetId, value })
    if (error) throw error
  } else if (existing.value === value) {
    const { error } = await sb.from('votes').delete().eq('id', existing.id)   // toggle off
    if (error) throw error
  } else {
    const { error } = await sb.from('votes').update({ value }).eq('id', existing.id)
    if (error) throw error
  }
}
```

Create `lib/queries/concepts.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConceptLike } from '@/lib/concepts'

export async function autocompleteConcepts(sb: SupabaseClient, term: string): Promise<ConceptLike[]> {
  const t = term.trim()
  if (!t) return []
  const { data, error } = await sb.from('concepts')
    .select('id, name, synonyms')
    .or(`name.ilike.%${t}%,synonyms.cs.{${t}}`)
    .limit(10)
  if (error) throw error
  return (data ?? []) as ConceptLike[]
}
```

- [ ] **Step 5: Run → PASS**. `npm run test:int -- tests/queries/search.int.test.ts`

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: query layer (search/datasets/votes/concepts)"
```

---

### Task 12: Server actions

**Files:**
- Create: `app/actions/datasets.ts`, `app/actions/votes.ts`
- Test: covered via UI/integration; add `tests/queries/vote.int.test.ts` for toggle semantics.

**Interfaces:**
- Consumes: `createClient` (server), validation schemas, query fns.
- Produces: `createDatasetAction(input: unknown): Promise<{ id: string } | { error: string }>`; `setStatusAction(id: string, status: DatasetStatus)`; `castVoteAction(input: unknown): Promise<{ ok: true } | { error: string }>`. All read the current user from the server client and enforce auth.

- [ ] **Step 1: Write failing integration test (toggle)**

Create `tests/queries/vote.int.test.ts`:
```ts
import { expect, test } from 'vitest'
import { getAdminClient } from '../helpers/db'
import { castVote } from '@/lib/queries/votes'

test('voting same value twice toggles it off (score returns to 0)', async () => {
  const db = getAdminClient()
  await db.from('modalities').upsert({ slug: 'ecg', name: 'ECG', category: 'signal' })
  const { data: ds } = await db.from('datasets')
    .insert({ title: 'T', modality: 'ecg', source_name: 'x', source_url: 'https://x', license: 'CC0-1.0' })
    .select('id').single()
  const { data: u } = await db.auth.admin.createUser({ email: `v${Date.now()}@t.co`, password: 'pw123456', email_confirm: true })
  await castVote(db, u!.user!.id, 'dataset', ds!.id, 1)
  await castVote(db, u!.user!.id, 'dataset', ds!.id, 1)
  const { data } = await db.from('datasets').select('score').eq('id', ds!.id).single()
  expect(data!.score).toBe(0)
})
```

- [ ] **Step 2: Run → FAIL** (until castVote correct; if Task 11 done it may pass — that's fine, it locks behavior).

- [ ] **Step 3: Implement actions**

Create `app/actions/votes.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { castVote } from '@/lib/queries/votes'
import { voteSchema } from '@/lib/validation'

export async function castVoteAction(input: unknown) {
  const parsed = voteSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid vote' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in to vote' }
  await castVote(sb, user.id, parsed.data.targetType, parsed.data.targetId, parsed.data.value)
  revalidatePath('/')
  return { ok: true as const }
}
```

Create `app/actions/datasets.ts`:
```ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createDataset, setDatasetStatus } from '@/lib/queries/datasets'
import { datasetInputSchema } from '@/lib/validation'
import type { DatasetStatus } from '@/lib/types'

export async function createDatasetAction(input: unknown) {
  const parsed = datasetInputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in to contribute' }
  const id = await createDataset(sb, parsed.data, user.id)
  revalidatePath('/')
  redirect(`/datasets/${id}`)
}

export async function setStatusAction(id: string, status: DatasetStatus) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Sign in' }
  await setDatasetStatus(sb, id, status)   // RLS enforces moderator-only for status change
  revalidatePath(`/datasets/${id}`)
  return { ok: true as const }
}
```

- [ ] **Step 4: Run → PASS**; typecheck `npx tsc --noEmit`.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: server actions for datasets and votes"
```

---

## Milestone 4 — UI

### Task 13: Search page + components

**Files:**
- Create: `app/page.tsx`, `components/SearchBar.tsx`, `components/Filters.tsx`, `components/DatasetCard.tsx`, `components/ConceptChips.tsx`

**Interfaces:**
- Consumes: `parseSearchParams`, `searchDatasets`, `createClient` (server).
- Produces: server-rendered search page reading `searchParams`; `DatasetCard({ dataset }: { dataset: DatasetRow })`.

- [ ] **Step 1: SearchBar + Filters (client components)**

Create `components/SearchBar.tsx`:
```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchBar() {
  const router = useRouter()
  const sp = useSearchParams()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams(sp.toString())
        const q = new FormData(e.currentTarget).get('q') as string
        q ? params.set('q', q) : params.delete('q')
        params.delete('page')
        router.push(`/?${params.toString()}`)
      }}
      className="flex gap-2"
    >
      <input name="q" defaultValue={sp.get('q') ?? ''} placeholder="e.g. ECG sudden cardiac death"
        className="flex-1 border rounded px-3 py-2" />
      <button className="bg-black text-white rounded px-4">Search</button>
    </form>
  )
}
```

Create `components/Filters.tsx`:
```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const MODALITIES = [
  { slug: '', name: 'Any modality' },
  { slug: 'ecg', name: 'ECG' },
  { slug: 'dermoscopy-image', name: 'Dermoscopy image' },
]
const ACCESS = [
  { v: '', name: 'Any access' },
  { v: 'open', name: 'Open' },
  { v: 'registration', name: 'Registration' },
  { v: 'data-use-agreement', name: 'Data use agreement' },
]

export function Filters() {
  const router = useRouter()
  const sp = useSearchParams()
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString())
    v ? p.set(k, v) : p.delete(k)
    p.delete('page')
    router.push(`/?${p.toString()}`)
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <select value={sp.get('modality') ?? ''} onChange={(e) => set('modality', e.target.value)} className="border rounded px-2 py-1">
        {MODALITIES.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
      </select>
      <select value={sp.get('access') ?? ''} onChange={(e) => set('access', e.target.value)} className="border rounded px-2 py-1">
        {ACCESS.map((a) => <option key={a.v} value={a.v}>{a.name}</option>)}
      </select>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={sp.get('hosted') === '1'} onChange={(e) => set('hosted', e.target.checked ? '1' : '')} />
        Hosted only
      </label>
    </div>
  )
}
```

- [ ] **Step 2: DatasetCard + ConceptChips**

Create `components/ConceptChips.tsx`:
```tsx
import type { LinkedConcept } from '@/lib/types'

export function ConceptChips({ concepts }: { concepts: Pick<LinkedConcept, 'name' | 'relationship'>[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {concepts.map((c, i) => (
        <span key={i} className="text-xs bg-gray-100 rounded px-2 py-0.5">{c.name} · {c.relationship}</span>
      ))}
    </div>
  )
}
```

Create `components/DatasetCard.tsx`:
```tsx
import Link from 'next/link'
import type { DatasetRow } from '@/lib/types'

export function DatasetCard({ dataset }: { dataset: DatasetRow }) {
  return (
    <div className="border rounded p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Link href={`/datasets/${dataset.id}`} className="font-medium hover:underline">{dataset.title}</Link>
        <span className="text-xs text-gray-500">▲ {dataset.score}</span>
      </div>
      <div className="text-xs text-gray-500">
        {dataset.modality} · {dataset.source_name} · {dataset.access}
        {dataset.status === 'verified' && <span className="ml-2 text-green-700">✓ verified</span>}
        {dataset.status === 'unverified' && <span className="ml-2 text-amber-600">unverified</span>}
      </div>
      <p className="text-sm text-gray-700 line-clamp-2">{dataset.description}</p>
    </div>
  )
}
```

- [ ] **Step 3: Search page**

Create `app/page.tsx`:
```tsx
import { SearchBar } from '@/components/SearchBar'
import { Filters } from '@/components/Filters'
import { DatasetCard } from '@/components/DatasetCard'
import { createClient } from '@/lib/supabase/server'
import { parseSearchParams } from '@/lib/search-params'
import { searchDatasets } from '@/lib/queries/search'

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseSearchParams(await searchParams)
  const sb = await createClient()
  const results = await searchDatasets(sb, filters)
  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">biomeddb</h1>
      <p className="text-sm text-gray-600">Find biomedical datasets by modality and linked disease / outcome / marker.</p>
      <SearchBar />
      <Filters />
      <div className="flex flex-col gap-3">
        {results.length === 0 && <p className="text-sm text-gray-500">No datasets found. Try a different term.</p>}
        {results.map((d) => <DatasetCard key={d.id} dataset={d} />)}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open `http://localhost:3000/?q=sudden%20cardiac%20death&modality=ecg`.
Expected: page renders (empty until seed in Task 16). No console/runtime errors. `npx tsc --noEmit` passes.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: search page + result components"
```

---

### Task 14: Dataset detail page + vote buttons

**Files:**
- Create: `app/datasets/[id]/page.tsx`, `components/VoteButtons.tsx`

**Interfaces:**
- Consumes: `getDataset`, `castVoteAction`, `setStatusAction`.
- Produces: detail page with metadata, download/source action, concept links (each votable), dataset vote, moderator verify/flag buttons.

- [ ] **Step 1: VoteButtons (client)**

Create `components/VoteButtons.tsx`:
```tsx
'use client'
import { useState, useTransition } from 'react'
import { castVoteAction } from '@/app/actions/votes'
import type { VoteTarget } from '@/lib/types'

export function VoteButtons({ targetType, targetId, score }: { targetType: VoteTarget; targetId: string; score: number }) {
  const [optimistic, setOptimistic] = useState(score)
  const [pending, start] = useTransition()
  const vote = (value: 1 | -1) => start(async () => {
    const res = await castVoteAction({ targetType, targetId, value })
    if ('error' in res) { alert(res.error); return }
    setOptimistic((s) => s + value)
  })
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <button disabled={pending} onClick={() => vote(1)} aria-label="upvote">▲</button>
      <span>{optimistic}</span>
      <button disabled={pending} onClick={() => vote(-1)} aria-label="downvote">▼</button>
    </span>
  )
}
```

- [ ] **Step 2: Detail page**

Create `app/datasets/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDataset } from '@/lib/queries/datasets'
import { setStatusAction } from '@/app/actions/datasets'
import { VoteButtons } from '@/components/VoteButtons'

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const ds = await getDataset(sb, id)
  if (!ds) notFound()
  const { data: { user } } = await sb.auth.getUser()

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{ds.title}</h1>
        <VoteButtons targetType="dataset" targetId={ds.id} score={ds.score} />
      </div>
      <div className="text-sm text-gray-600">
        {ds.modality} · {ds.source_name} · {ds.access} · {ds.license} · status: {ds.status}
      </div>
      <p>{ds.description}</p>

      {ds.host_type === 'hosted' && ds.file_path
        ? <a className="bg-black text-white rounded px-4 py-2 w-fit" href={`/api/download/${ds.id}`}>Download</a>
        : <a className="underline w-fit" href={ds.source_url} target="_blank" rel="noreferrer">Go to source ↗</a>}

      <section>
        <h2 className="font-medium">Linked concepts</h2>
        <ul className="flex flex-col gap-1 mt-1">
          {ds.concepts.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span>{c.name} · {c.relationship}</span>
              <VoteButtons targetType="dataset_concept" targetId={c.id} score={c.score} />
            </li>
          ))}
        </ul>
      </section>

      {user && (
        <form action={async () => { 'use server'; await setStatusAction(ds.id, 'verified') }}>
          <button className="text-sm underline">Mark verified (moderators only)</button>
        </form>
      )}
    </main>
  )
}
```
> The download route `/api/download/[id]` is built in Task 16 (hosted files). Until then only `linked` datasets exist, so the source link path is exercised.

- [ ] **Step 3: Smoke test + typecheck**

`npx tsc --noEmit`; with dev server, visit a known dataset id after seeding (Task 16). For now verify the route compiles and 404s on a random id.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: dataset detail page + vote buttons"
```

---

### Task 15: Auth + contribute form

**Files:**
- Create: `app/login/page.tsx`, `app/contribute/page.tsx`, `components/ConceptAutocomplete.tsx`, `app/layout.tsx` (modify nav)

**Interfaces:**
- Consumes: `createClient` (browser), `autocompleteConcepts`, `createDatasetAction`.
- Produces: email magic-link/password login; contribute form posting validated `DatasetInput`; concept autocomplete that returns `{conceptId, relationship}` links.

- [ ] **Step 1: Login page**

Create `app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const sb = createClient()
  return (
    <main className="max-w-sm mx-auto p-6 flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {sent ? <p className="text-sm">Check your email for a magic link.</p> : (
        <form onSubmit={async (e) => {
          e.preventDefault()
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/` } })
          if (error) alert(error.message); else setSent(true)
        }} className="flex flex-col gap-2">
          <input className="border rounded px-3 py-2" type="email" required placeholder="you@lab.org"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="bg-black text-white rounded px-4 py-2">Send magic link</button>
        </form>
      )}
    </main>
  )
}
```
> Local Supabase captures emails at `http://127.0.0.1:54324` (Inbucket) — use it to grab the magic link during dev.

- [ ] **Step 2: Concept autocomplete (client)**

Create `components/ConceptAutocomplete.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { autocompleteConcepts } from '@/lib/queries/concepts'
import type { RelationshipType } from '@/lib/types'

export interface SelectedConcept { conceptId: string; name: string; relationship: RelationshipType }

export function ConceptAutocomplete({ onChange }: { onChange: (c: SelectedConcept[]) => void }) {
  const sb = createClient()
  const [term, setTerm] = useState('')
  const [opts, setOpts] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<SelectedConcept[]>([])

  const search = async (t: string) => {
    setTerm(t)
    if (t.length < 2) { setOpts([]); return }
    const res = await autocompleteConcepts(sb, t)
    setOpts(res.map((c) => ({ id: c.id, name: c.name })))
  }
  const add = (id: string, name: string) => {
    const next = [...selected, { conceptId: id, name, relationship: 'studies' as RelationshipType }]
    setSelected(next); onChange(next); setTerm(''); setOpts([])
  }
  return (
    <div className="flex flex-col gap-1">
      <input className="border rounded px-3 py-2" placeholder="link a disease/outcome/marker"
        value={term} onChange={(e) => search(e.target.value)} />
      {opts.length > 0 && (
        <ul className="border rounded">
          {opts.map((o) => <li key={o.id}><button type="button" className="block w-full text-left px-3 py-1 hover:bg-gray-100" onClick={() => add(o.id, o.name)}>{o.name}</button></li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-1">
        {selected.map((s) => <span key={s.conceptId} className="text-xs bg-gray-100 rounded px-2 py-0.5">{s.name}</span>)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Contribute form**

Create `app/contribute/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createDatasetAction } from '@/app/actions/datasets'
import { ConceptAutocomplete, type SelectedConcept } from '@/components/ConceptAutocomplete'

export default function Contribute() {
  const [concepts, setConcepts] = useState<SelectedConcept[]>([])
  const [error, setError] = useState<string | null>(null)
  return (
    <main className="max-w-xl mx-auto p-6 flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Add a dataset</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form action={async (fd) => {
        const input = {
          title: fd.get('title'), description: fd.get('description') ?? '', modality: fd.get('modality'),
          sourceName: fd.get('sourceName'), sourceUrl: fd.get('sourceUrl'), hostType: 'linked',
          license: fd.get('license') ?? '', access: fd.get('access'),
          concepts: concepts.map((c) => ({ conceptId: c.conceptId, relationship: c.relationship })),
        }
        const res = await createDatasetAction(input)
        if (res && 'error' in res) setError(res.error)
      }} className="flex flex-col gap-2">
        <input name="title" required placeholder="Title" className="border rounded px-3 py-2" />
        <textarea name="description" placeholder="Description" className="border rounded px-3 py-2" />
        <select name="modality" className="border rounded px-3 py-2">
          <option value="ecg">ECG</option><option value="dermoscopy-image">Dermoscopy image</option>
        </select>
        <input name="sourceName" required placeholder="Source name (e.g. PhysioNet)" className="border rounded px-3 py-2" />
        <input name="sourceUrl" required type="url" placeholder="https://source/url" className="border rounded px-3 py-2" />
        <input name="license" placeholder="License (e.g. CC0-1.0)" className="border rounded px-3 py-2" />
        <select name="access" className="border rounded px-3 py-2">
          <option value="open">Open</option><option value="registration">Registration</option><option value="data-use-agreement">Data use agreement</option>
        </select>
        <ConceptAutocomplete onChange={setConcepts} />
        <button className="bg-black text-white rounded px-4 py-2">Submit</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Nav in layout**

Modify `app/layout.tsx` body to include a simple nav:
```tsx
// inside <body> before {children}
<nav className="border-b px-6 py-3 flex gap-4 text-sm">
  <a href="/" className="font-semibold">biomeddb</a>
  <a href="/contribute">Contribute</a>
  <a href="/login" className="ml-auto">Sign in</a>
</nav>
```

- [ ] **Step 5: Smoke test**

`npm run dev`: sign in via magic link (Inbucket), submit a `linked` dataset, confirm redirect to its detail page and that it appears in search tagged `unverified`. `npx tsc --noEmit` passes.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: auth + contribute form with concept autocomplete"
```

---

## Milestone 5 — Seed, hosted files, deploy

### Task 16: Seed importers + hosted download route

**Files:**
- Create: `scripts/seed.ts`, `app/api/download/[id]/route.ts`
- Modify: `package.json` (add `"seed": "tsx scripts/seed.ts"`)

**Interfaces:**
- Consumes: `createAdminClient`.
- Produces: idempotent seed of modalities, concepts (with synonyms), and real `linked` datasets for PhysioNet ECG + ISIC/HAM10000 skin; download route streaming a Storage file for `hosted` datasets.

- [ ] **Step 1: Seed script**

Run `npm i -D tsx`. Create `scripts/seed.ts`:
```ts
import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  await db.from('modalities').upsert([
    { slug: 'ecg', name: 'Electrocardiogram (ECG)', category: 'signal' },
    { slug: 'dermoscopy-image', name: 'Dermoscopy image', category: 'image' },
  ])

  const concepts = [
    { name: 'Sudden cardiac death', slug: 'sudden-cardiac-death', kind: 'disease',
      synonyms: ['sudden death syndrome', 'SADS', 'SCD', 'sudden arrhythmic death'] },
    { name: 'Melanoma', slug: 'melanoma', kind: 'disease',
      synonyms: ['cutaneous melanoma', 'malignant melanoma', 'skin cancer'] },
    { name: 'Cutaneous carcinoma', slug: 'cutaneous-carcinoma', kind: 'disease',
      synonyms: ['basal cell carcinoma', 'squamous cell carcinoma', 'non-melanoma skin cancer'] },
  ]
  await db.from('concepts').upsert(concepts, { onConflict: 'slug' })
  const { data: conceptRows } = await db.from('concepts').select('id, slug')
  const cid = (slug: string) => conceptRows!.find((c) => c.slug === slug)!.id

  const datasets = [
    { title: 'Sudden Cardiac Death Holter Database', description: 'Long-term ECG (Holter) recordings from patients who experienced sudden cardiac death.',
      modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/',
      host_type: 'linked', license: 'ODC-By-1.0', access: 'open', format: 'WFDB', status: 'verified', links: ['sudden-cardiac-death'] },
    { title: 'MIT-BIH Arrhythmia Database', description: 'Annotated ambulatory ECG recordings widely used for arrhythmia research.',
      modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/mitdb/',
      host_type: 'linked', license: 'ODC-By-1.0', access: 'open', format: 'WFDB', status: 'verified', links: ['sudden-cardiac-death'] },
    { title: 'HAM10000', description: '10,015 dermatoscopic images of pigmented skin lesions across diagnostic categories.',
      modality: 'dermoscopy-image', source_name: 'Harvard Dataverse / ISIC', source_url: 'https://doi.org/10.7910/DVN/DBW86T',
      host_type: 'linked', license: 'CC-BY-NC-4.0', access: 'open', format: 'JPEG', status: 'verified', links: ['melanoma', 'cutaneous-carcinoma'] },
    { title: 'ISIC Archive (Skin Lesion Images)', description: 'Largest public archive of dermoscopic images for skin cancer (melanoma) detection.',
      modality: 'dermoscopy-image', source_name: 'ISIC', source_url: 'https://www.isic-archive.com/',
      host_type: 'linked', license: 'CC-0 / CC-BY (varies)', access: 'open', format: 'JPEG', status: 'verified', links: ['melanoma'] },
  ]

  for (const d of datasets) {
    const { links, ...row } = d
    const { data: existing } = await db.from('datasets').select('id').eq('source_url', row.source_url).maybeSingle()
    let id = existing?.id
    if (!id) {
      const { data, error } = await db.from('datasets').insert(row).select('id').single()
      if (error) throw error
      id = data!.id
    }
    for (const slug of links) {
      await db.from('dataset_concepts')
        .upsert({ dataset_id: id, concept_id: cid(slug), relationship: 'studies' }, { onConflict: 'dataset_id,concept_id,relationship' })
    }
  }
  console.log('seed complete')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Download route (hosted)**

Create `app/api/download/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: ds } = await sb.from('datasets').select('file_path, host_type').eq('id', id).maybeSingle()
  if (!ds || ds.host_type !== 'hosted' || !ds.file_path) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { data, error } = await sb.storage.from('datasets').createSignedUrl(ds.file_path, 60)
  if (error || !data) return NextResponse.json({ error: 'unavailable' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
```
> Create a private Storage bucket named `datasets` in Supabase (Studio → Storage, or `supabase` SQL). Hosted-file upload UI is a phase-2 enhancement; for MVP, hosted entries are added by moderators directly.

- [ ] **Step 3: Run seed + verify driving searches**
```bash
npm run seed
npm run dev
```
- Visit `/?q=sudden%20cardiac%20death&modality=ecg` → SCD Holter + MIT-BIH appear.
- Visit `/?q=mole%20skin%20cancer&modality=dermoscopy-image` → HAM10000 + ISIC appear.
- Each result's "Go to source" link resolves to the correct external page.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: seed importers (PhysioNet + ISIC) and hosted download route"
```

---

### Task 17: Deploy to Vercel + Supabase cloud

**Files:**
- Create: `README.md` (run/deploy instructions), `.github/workflows/ci.yml` (optional)

**Interfaces:** none (ops task).

- [ ] **Step 1: Create cloud Supabase + push schema**
```bash
npx supabase link --project-ref <ref>
npx supabase db push           # applies migrations to cloud
# set cloud env vars locally, then:
npm run seed
```
Create the private `datasets` Storage bucket in the cloud project.

- [ ] **Step 2: Deploy to Vercel**
- Import the repo in Vercel (or `npx vercel`). Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, do not prefix with `NEXT_PUBLIC`).
- In Supabase Auth settings, add the Vercel URL to allowed redirect URLs.

- [ ] **Step 3: Production smoke test (success criteria §10)**
Verify on the deployed URL: both driving searches return results; sign-in works; a new linked dataset can be added and shows `unverified`; voting changes score and ordering; a moderator (set `profiles.role='moderator'` via SQL for your user) can verify.

- [ ] **Step 4: Write README + commit**
```bash
git add -A && git commit -m "docs: run/deploy instructions; chore: deploy"
```

---

## Self-Review (completed)

- **Spec coverage:** search + filters (T5/9/11/13), detail + download/link (T14/16), contribution (T15), voting on datasets *and* links (T4/12/14), synonym ontology (T8/16), unverified-visible + moderator verify/flag (T6/12/14), seed PhysioNet+ISIC (T16), hosted files (T16), deploy (T17), success criteria §10 (T17 step 3). All covered.
- **Placeholder scan:** no TBD/TODO; every code step shows complete, copy-pasteable code.
- **Type consistency:** enum string values match the Global Constraints block across SQL, Zod, and TS; `searchDatasets`, `getDataset`, `createDataset`, `castVote`, `setDatasetStatus`, `autocompleteConcepts` signatures are defined once (T11) and consumed unchanged (T12–T16).

## Phase 2 (not in this plan)
Automated crawlers, pgvector semantic search, reputation-weighted voting, wiki edit-merge, public API, dedup, hosted-file upload UI, multi-axis quality ratings.
