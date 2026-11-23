-- Retire the shared API while preserving historical rows.
drop function if exists public.get_pending_friend_names();
drop function if exists public.get_friend_progress();
drop function if exists public.request_friend_by_code(text);

revoke all privileges on public.friend_requests from public, anon, authenticated;
revoke update(status) on public.friend_requests from public, anon, authenticated;
drop policy if exists friend_requests_participants_read on public.friend_requests;
drop policy if exists friend_requests_recipient_reply on public.friend_requests;

alter table public.profiles
  alter column friend_code drop not null,
  alter column friend_code drop default;
