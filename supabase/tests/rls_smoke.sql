-- Run with psql against a migrated local Supabase database.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check_that(condition boolean, description text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Check failed: %', description;
  end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'kotoba-a@example.test', '{"nickname":"Alice"}'),
  ('00000000-0000-4000-8000-000000000002', 'kotoba-b@example.test', '{"nickname":"Bob"}');

set local role anon;
select pg_temp.check_that(not has_table_privilege('public.kanji', 'select'), 'anonymous content access denied');
set local role authenticated;
select pg_temp.check_that(to_regprocedure('public.get_friend_progress()') is null, 'shared progress RPC retired');
select pg_temp.check_that(not has_table_privilege('public.friend_requests', 'select'), 'retired requests inaccessible');
select pg_temp.check_that(not has_column_privilege('public.friend_requests', 'status', 'update'), 'retired requests immutable');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.check_that((select array_agg(nickname) from public.profiles) = array['Alice'], 'signup trigger and self-only profile');
select pg_temp.check_that(exists(select from public.vocabulary_kanji), 'authenticated linked content available');

insert into public.review_state(user_id, item_type, item_id, review_mode)
select auth.uid(), 'kanji', id, 'meaning' from public.kanji where character = '学';
insert into public.review_logs(user_id, item_type, item_id, review_mode, correct)
select auth.uid(), 'kanji', id, 'meaning', true from public.kanji where character = '学';

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select pg_temp.check_that((select array_agg(nickname) from public.profiles) = array['Bob'], 'account profile remains private');
select pg_temp.check_that(not exists(select from public.review_state), 'other user cannot read review state');
select pg_temp.check_that(not exists(select from public.review_logs), 'other user cannot read review logs');

rollback;
