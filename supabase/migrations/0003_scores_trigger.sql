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
