-- Kotoba v0.1 — run in Supabase SQL Editor on a new project.
-- All user progress is private. The friend summary function reveals only opted-in aggregates.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '학습자' check (char_length(nickname) between 1 and 20),
  target_level integer not null default 5 check (target_level in (2,3,4,5)),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, nickname)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''), '학습자'), 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.kanji (
  id uuid primary key default gen_random_uuid(),
  character text not null unique,
  meaning_ko text not null,
  onyomi text[] not null default '{}',
  kunyomi text[] not null default '{}',
  jlpt_level integer not null check (jlpt_level in (2,3,4,5))
);
create index if not exists idx_kanji_level on public.kanji(jlpt_level);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  reading text not null,
  meaning_ko text not null,
  jlpt_level integer not null check (jlpt_level in (2,3,4,5)),
  example_ja text,
  example_ko text,
  unique (word, reading)
);
create index if not exists idx_vocab_level on public.vocabulary(jlpt_level);

create table if not exists public.vocabulary_kanji (
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  kanji_id uuid not null references public.kanji(id) on delete cascade,
  position integer not null check (position >= 1),
  primary key (vocabulary_id, kanji_id)
);

create table if not exists public.review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('kanji','vocabulary')),
  item_id uuid not null,
  review_mode text not null check (review_mode in ('meaning','reading')),
  streak integer not null default 0 check (streak >= 0),
  interval_days integer not null default 0 check (interval_days >= 0),
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, item_type, item_id, review_mode),
  constraint kanji_only_meaning check (item_type <> 'kanji' or review_mode = 'meaning')
);
create index if not exists idx_review_due on public.review_state(user_id, due_at);

create table if not exists public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('kanji','vocabulary')),
  item_id uuid not null,
  review_mode text not null check (review_mode in ('meaning','reading')),
  correct boolean not null,
  reviewed_at timestamptz not null default now()
);
create index if not exists idx_logs_user_date on public.review_logs(user_id, reviewed_at desc);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sender_id, recipient_id),
  check(sender_id <> recipient_id)
);
create index if not exists idx_friend_recipient on public.friend_requests(recipient_id, status);

alter table public.profiles enable row level security;
alter table public.kanji enable row level security;
alter table public.vocabulary enable row level security;
alter table public.vocabulary_kanji enable row level security;
alter table public.review_state enable row level security;
alter table public.review_logs enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "profiles_read_related" on public.profiles;
create policy "profiles_read_related" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.friend_requests fr
    where (fr.sender_id = (select auth.uid()) and fr.recipient_id = profiles.id)
       or (fr.recipient_id = (select auth.uid()) and fr.sender_id = profiles.id)
  )
);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using(id = (select auth.uid())) with check(id = (select auth.uid()));

drop policy if exists "kanji_read" on public.kanji;
create policy "kanji_read" on public.kanji for select to authenticated using (true);
drop policy if exists "vocabulary_read" on public.vocabulary;
create policy "vocabulary_read" on public.vocabulary for select to authenticated using (true);
drop policy if exists "vocabulary_kanji_read" on public.vocabulary_kanji;
create policy "vocabulary_kanji_read" on public.vocabulary_kanji for select to authenticated using (true);

drop policy if exists "review_state_self" on public.review_state;
create policy "review_state_self" on public.review_state for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "review_logs_self" on public.review_logs;
create policy "review_logs_self" on public.review_logs for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "review_logs_insert_self" on public.review_logs;
create policy "review_logs_insert_self" on public.review_logs for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "friend_requests_participants_read" on public.friend_requests;
create policy "friend_requests_participants_read" on public.friend_requests for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists "friend_requests_recipient_reply" on public.friend_requests;
create policy "friend_requests_recipient_reply" on public.friend_requests for update to authenticated
using(recipient_id = (select auth.uid()) and status = 'pending')
with check(recipient_id = (select auth.uid()) and status in ('accepted','rejected'));

-- Explicitly limit columns writable from the client.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(nickname, target_level) on public.profiles to authenticated;
revoke all on public.kanji, public.vocabulary, public.vocabulary_kanji from anon, authenticated;
grant select on public.kanji, public.vocabulary, public.vocabulary_kanji to authenticated;
revoke all on public.review_state, public.review_logs from anon, authenticated;
grant select, insert, update, delete on public.review_state to authenticated;
grant select, insert on public.review_logs to authenticated;
grant usage, select on sequence public.review_logs_id_seq to authenticated;
revoke all on public.friend_requests from anon, authenticated;
grant select on public.friend_requests to authenticated;
grant update(status) on public.friend_requests to authenticated;

-- Invite via a code. The code is not an authentication factor.
create or replace function public.request_friend_by_code(p_code text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  target_id uuid;
  existing_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_code is null or upper(btrim(p_code)) !~ '^[A-F0-9]{10}$' then return 'invalid_code'; end if;
  select id into target_id from public.profiles where friend_code = upper(btrim(p_code));
  if target_id is null then return 'not_found'; end if;
  if target_id = auth.uid() then return 'self'; end if;
  if exists (
    select 1 from public.friend_requests
    where ((sender_id=auth.uid() and recipient_id=target_id)
      or (sender_id=target_id and recipient_id=auth.uid()))
      and status='accepted'
  ) then return 'already_friends'; end if;
  if exists (
    select 1 from public.friend_requests
    where sender_id=target_id and recipient_id=auth.uid() and status='pending'
  ) then return 'incoming_request'; end if;
  select status into existing_status from public.friend_requests
  where sender_id=auth.uid() and recipient_id=target_id;
  if existing_status='pending' then return 'already_pending'; end if;
  insert into public.friend_requests(sender_id, recipient_id, status)
  values(auth.uid(), target_id, 'pending')
  on conflict (sender_id, recipient_id)
    do update set status='pending', updated_at=now();
  return 'sent';
end;
$$;

-- Only aggregated, consented friend progress can be read.
create or replace function public.get_friend_progress()
returns table (
  user_id uuid,
  nickname text,
  kanji_learned bigint,
  vocab_learned bigint,
  reviews_last_7d bigint
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nickname,
    (select count(distinct rs.item_id) from public.review_state rs where rs.user_id=p.id and rs.item_type='kanji'),
    (select count(distinct rs.item_id) from public.review_state rs where rs.user_id=p.id and rs.item_type='vocabulary'),
    (select count(*) from public.review_logs lg where lg.user_id=p.id and lg.reviewed_at >= now() - interval '7 days')
  from public.profiles p
  where auth.uid() is not null
    and (
      p.id=auth.uid()
      or exists(
        select 1 from public.friend_requests fr
        where fr.status='accepted'
          and ((fr.sender_id=auth.uid() and fr.recipient_id=p.id)
            or (fr.recipient_id=auth.uid() and fr.sender_id=p.id))
      )
    );
$$;

revoke all on function public.request_friend_by_code(text) from public, anon;
grant execute on function public.request_friend_by_code(text) to authenticated;
revoke all on function public.get_friend_progress() from public, anon;
grant execute on function public.get_friend_progress() to authenticated;

-- Curated minimal smoke-test content, NOT a complete or official JLPT syllabus.
insert into public.kanji(character,meaning_ko,onyomi,kunyomi,jlpt_level) values
('学','배우다',array['ガク'],array['まなぶ'],5),
('生','살다·태어나다',array['セイ','ショウ'],array['いきる','うまれる','なま'],5),
('先','앞·먼저',array['セン'],array['さき'],5),
('校','학교',array['コウ'],array[]::text[],5),
('日','날·해',array['ニチ','ジツ'],array['ひ','か'],5),
('本','근본·책',array['ホン'],array['もと'],5),
('人','사람',array['ジン','ニン'],array['ひと'],5),
('大','크다',array['ダイ','タイ'],array['おおきい'],5),
('小','작다',array['ショウ'],array['ちいさい'],5),
('行','가다',array['コウ','ギョウ'],array['いく','おこなう'],5),
('食','먹다',array['ショク'],array['たべる'],5),
('見','보다',array['ケン'],array['みる'],5),
('文','글·문장',array['ブン','モン'],array['ふみ'],4),
('所','곳',array['ショ'],array['ところ'],4),
('書','쓰다',array['ショ'],array['かく'],4),
('住','살다·거주하다',array['ジュウ'],array['すむ'],4),
('作','만들다',array['サク','サ'],array['つくる'],4),
('開','열다',array['カイ'],array['ひらく','あける'],3),
('発','출발·발생',array['ハツ','ホツ'],array[]::text[],3),
('情','정·사정',array['ジョウ'],array['なさけ'],3),
('報','알리다·보답',array['ホウ'],array['むくいる'],3),
('経','경과·지나다',array['ケイ'],array['へる'],2),
('済','끝내다·완료하다',array['サイ'],array['すむ'],2),
('管','관리하다',array['カン'],array['くだ'],2),
('理','이치·논리',array['リ'],array[]::text[],2)
on conflict(character) do nothing;

insert into public.vocabulary(word,reading,meaning_ko,jlpt_level,example_ja,example_ko) values
('学校','がっこう','학교',5,'学校へ行きます。','학교에 갑니다.'),
('学生','がくせい','학생',5,'私は学生です。','저는 학생입니다.'),
('先生','せんせい','선생님',5,'先生に聞きます。','선생님께 물어봅니다.'),
('日本','にほん','일본',5,'日本へ行きたいです。','일본에 가고 싶습니다.'),
('日本人','にほんじん','일본인',5,'彼は日本人です。','그는 일본인입니다.'),
('大学','だいがく','대학교',5,'大学で勉強します。','대학교에서 공부합니다.'),
('食べる','たべる','먹다',5,'朝ご飯を食べます。','아침밥을 먹습니다.'),
('行く','いく','가다',5,'駅に行きます。','역에 갑니다.'),
('見る','みる','보다',5,'映画を見ます。','영화를 봅니다.'),
('書く','かく','쓰다',4,'名前を書いてください。','이름을 써 주세요.'),
('住所','じゅうしょ','주소',4,'住所を書きます。','주소를 씁니다.'),
('作文','さくぶん','작문',4,'日本語で作文を書きます。','일본어로 작문을 씁니다.'),
('開発','かいはつ','개발',3,'アプリを開発しています。','앱을 개발하고 있습니다.'),
('情報','じょうほう','정보',3,'新しい情報を確認します。','새로운 정보를 확인합니다.'),
('経済','けいざい','경제',2,'経済のニュースを読みます。','경제 뉴스를 읽습니다.'),
('管理','かんり','관리',2,'データを管理します。','데이터를 관리합니다.')
on conflict(word,reading) do nothing;

insert into public.vocabulary_kanji(vocabulary_id,kanji_id,position)
select v.id, k.id, pairs.pos
from (values
('学校','学',1),('学校','校',2),('学生','学',1),('学生','生',2),
('先生','先',1),('先生','生',2),
('日本','日',1),('日本','本',2),
('日本人','日',1),('日本人','本',2),('日本人','人',3),
('大学','大',1),('大学','学',2),
('食べる','食',1),('行く','行',1),('見る','見',1),
('書く','書',1),('住所','住',1),('作文','作',1),('作文','文',2),('住所','所',2),
('開発','開',1),('開発','発',2),
('情報','情',1),('情報','報',2),
('経済','経',1),('経済','済',2),
('管理','管',1),('管理','理',2)
) as pairs(word,character,pos)
join public.vocabulary v on v.word=pairs.word
join public.kanji k on k.character=pairs.character
on conflict(vocabulary_id,kanji_id) do nothing;
