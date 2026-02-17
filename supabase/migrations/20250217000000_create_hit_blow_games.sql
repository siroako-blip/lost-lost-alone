-- Hit and Blow 対戦用テーブル
-- Host = player1（秘密の数字を持つ）, Join = player2（予想する側）
create table if not exists public.hit_blow_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player1_id text not null,
  player2_id text,
  game_state jsonb
);

comment on column public.hit_blow_games.player1_id is 'Host のプレイヤーID';
comment on column public.hit_blow_games.player2_id is 'Guest のプレイヤーID';
comment on column public.hit_blow_games.game_state is 'HitBlowGameState（secret, history, solved）';

alter table public.hit_blow_games enable row level security;

create policy "Allow all for hit_blow_games"
  on public.hit_blow_games
  for all
  using (true)
  with check (true);
