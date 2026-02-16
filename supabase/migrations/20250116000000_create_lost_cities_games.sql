-- Lost Cities 対戦用テーブル
-- Host = player1, Join = player2
create table if not exists public.lost_cities_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player1_id text not null,
  player2_id text,
  game_state jsonb
);

comment on column public.lost_cities_games.player1_id is 'Host のプレイヤーID（クライアントで生成したUUID）';
comment on column public.lost_cities_games.player2_id is 'Join のプレイヤーID';
comment on column public.lost_cities_games.game_state is 'GameState の JSON（deck, hands, expeditions, discardPiles, currentPlayer, phase, lastDiscardedColor）';

-- Realtime: Supabase ダッシュボードの Database → Replication で
-- lost_cities_games テーブルを有効化してください。

-- RLS: 匿名で読み書き可能（本番では適宜制限をかける）
alter table public.lost_cities_games enable row level security;

create policy "Allow all for lost_cities_games"
  on public.lost_cities_games
  for all
  using (true)
  with check (true);
