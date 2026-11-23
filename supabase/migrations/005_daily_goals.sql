begin;
alter table public.profiles
  add column daily_new_goal integer not null default 10 check (daily_new_goal between 1 and 100),
  add column daily_review_goal integer not null default 20 check (daily_review_goal between 1 and 100);
grant update(daily_new_goal, daily_review_goal) on public.profiles to authenticated;

alter table public.review_state add column first_studied_at timestamptz,
  add column last_reviewed_at timestamptz;
update public.review_state s set first_studied_at = history.first_at,
  last_reviewed_at = history.repeat_at
from (
  select user_id, item_type, item_id, review_mode, min(reviewed_at) as first_at,
    case when count(*) > 1 then max(reviewed_at) end as repeat_at
  from public.review_logs group by user_id, item_type, item_id, review_mode
) history
where (s.user_id,s.item_type,s.item_id,s.review_mode) =
      (history.user_id,history.item_type,history.item_id,history.review_mode);
update public.review_state set first_studied_at = updated_at where first_studied_at is null;
alter table public.review_state alter column first_studied_at set not null,
  alter column first_studied_at set default now();

create function public.track_card_study_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.first_studied_at := now();
    new.last_reviewed_at := null;
  else
    new.first_studied_at := old.first_studied_at;
    new.last_reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger track_card_study_dates before insert or update on public.review_state
for each row execute function public.track_card_study_dates();
commit;
