-- Keep full profiles private. Pending request participants only need display names.
drop policy if exists "profiles_read_related" on public.profiles;
create policy "profiles_read_self" on public.profiles for select to authenticated
using (id = (select auth.uid()));

create function public.get_pending_friend_names()
returns table (id uuid, nickname text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nickname
  from public.profiles p
  where auth.uid() is not null
    and exists (
      select 1 from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.sender_id = auth.uid() and fr.recipient_id = p.id)
          or (fr.recipient_id = auth.uid() and fr.sender_id = p.id)
        )
    );
$$;

revoke all on function public.get_pending_friend_names() from public, anon;
grant execute on function public.get_pending_friend_names() to authenticated;
