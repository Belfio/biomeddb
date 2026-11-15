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
