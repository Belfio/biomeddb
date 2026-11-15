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
