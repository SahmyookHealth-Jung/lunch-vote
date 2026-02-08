-- 투표 방 상세 페이지에 필요한 Supabase 테이블
-- Supabase SQL Editor에서 실행하세요.

-- 참여자 (방 입장 시 insert)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null,
  created_at timestamptz default now()
);

-- 후보 (식당)
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  link text,
  created_at timestamptz default now()
);

-- 투표 (참여자당 1표)
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade unique,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  created_at timestamptz default now()
);

-- RLS (선택)
alter table public.participants enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

create policy "Allow all participants" on public.participants for all using (true) with check (true);
create policy "Allow all candidates" on public.candidates for all using (true) with check (true);
create policy "Allow all votes" on public.votes for all using (true) with check (true);
