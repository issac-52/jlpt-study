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

select friend_code as bob_code from public.profiles where nickname = 'Bob'
  and id = '00000000-0000-4000-8000-000000000002' \gset

set local role anon;
select pg_temp.check_that(not has_table_privilege('public.kanji', 'select'), 'anonymous content access denied');
select pg_temp.check_that(not has_function_privilege('public.get_pending_friend_names()', 'execute'), 'anonymous names RPC denied');
select pg_temp.check_that(not has_function_privilege('public.get_friend_progress()', 'execute'), 'anonymous stats RPC denied');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.check_that((select array_agg(nickname) from public.profiles) = array['Alice'], 'signup trigger and self-only profile');
select pg_temp.check_that(exists(select from public.vocabulary_kanji), 'authenticated linked content available');

insert into public.review_state(user_id, item_type, item_id, review_mode)
select auth.uid(), 'kanji', id, 'meaning' from public.kanji where character = '学';
insert into public.review_logs(user_id, item_type, item_id, review_mode, correct)
select auth.uid(), 'kanji', id, 'meaning', true from public.kanji where character = '学';

select pg_temp.check_that(public.request_friend_by_code(:'bob_code') = 'sent', 'invite by code');
select pg_temp.check_that((select array_agg(nickname) from public.get_pending_friend_names()) = array['Bob'], 'sender sees pending nickname');
select pg_temp.check_that((select array_agg(nickname) from public.get_friend_progress()) = array['Alice'], 'pending request shares no stats');

with changed as (
  update public.friend_requests set status = 'accepted' returning id
)
select pg_temp.check_that(not exists(select from changed), 'sender cannot accept their own request');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select pg_temp.check_that((select array_agg(nickname) from public.profiles) = array['Bob'], 'pending profile remains private');
select pg_temp.check_that((select array_agg(nickname) from public.get_pending_friend_names()) = array['Alice'], 'recipient sees pending nickname');

with changed as (
  update public.friend_requests set status = 'accepted' where recipient_id = auth.uid() returning id
)
select pg_temp.check_that((select count(*) from changed) = 1, 'recipient accepts one request');

select pg_temp.check_that(not exists(select from public.get_pending_friend_names()), 'accepted request absent from pending names');
select pg_temp.check_that(exists(
  select from public.get_friend_progress()
  where nickname = 'Alice' and kanji_learned = 1 and vocab_learned = 0 and reviews_last_7d = 1
), 'accepted friend sees aggregate counts');
select pg_temp.check_that((select array_agg(nickname) from public.profiles) = array['Bob'], 'accepted profile remains private');
select pg_temp.check_that(not exists(select from public.review_state), 'accepted friend cannot read review state');
select pg_temp.check_that(not exists(select from public.review_logs), 'accepted friend cannot read review logs');

rollback;
