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
create policy read_edits on dataset_edits for select using (true);

-- concepts: any authenticated user may propose
create policy ins_concepts on concepts for insert to authenticated with check (true);

-- datasets: authenticated insert, must own row
create policy ins_datasets on datasets for insert to authenticated
  with check (submitted_by = auth.uid());
-- owners edit own non-status fields; moderators edit anything
-- NOTE: the status-unchanged subquery below relies on the public read_datasets SELECT policy; do not remove that policy or owner updates will break.
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
create policy upd_votes on votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy del_votes on votes for delete to authenticated using (user_id = auth.uid());

-- edits: authenticated insert
create policy ins_edits on dataset_edits for insert to authenticated with check (editor_id = auth.uid());
