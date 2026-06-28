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
