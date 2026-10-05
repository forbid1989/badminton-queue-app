-- Migration v3: sport + sessions-per-week survey fields, and anonymous usage tracking.
-- Run in the Supabase SQL Editor AFTER feedback_v2_migration.sql.

-- ---------- Feedback survey additions ----------
alter table public.feedback
  add column if not exists sports text[] not null default '{}',
  add column if not exists sessions_per_week text;

alter table public.feedback
  drop constraint if exists feedback_sports_check,
  drop constraint if exists feedback_sessions_per_week_check;

alter table public.feedback
  add constraint feedback_sports_check
    check (
      cardinality(sports) <= 5
      and sports <@ array['badminton','pickleball','tennis','table_tennis','other']
    ),
  add constraint feedback_sessions_per_week_check
    check (sessions_per_week is null or sessions_per_week in ('less_than_1','1','2_3','4_plus'));

-- ---------- Anonymous usage tracking ----------
-- Counts only: no names, no player data, no payment data. device_id is a random id kept in the
-- browser's localStorage and is not tied to any person.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  device_id uuid not null,
  event text not null check (event in ('app_open','game_completed')),
  players_total int check (players_total between 0 and 500),
  courts_total int check (courts_total between 0 and 100),
  queues_total int check (queues_total between 0 and 100),
  app_version text check (char_length(app_version) <= 20),
  constraint usage_events_time_check
    check (occurred_at between now() - interval '30 days' and now() + interval '1 day')
);

create index if not exists usage_events_device_day_idx
  on public.usage_events (device_id, occurred_at);

alter table public.usage_events enable row level security;

grant insert on public.usage_events to anon;

drop policy if exists "anyone can insert usage events" on public.usage_events;

create policy "anyone can insert usage events"
  on public.usage_events for insert to anon
  with check (true);

-- ---------- Handy queries (run in the SQL Editor, you read as the project owner) ----------

-- Weekly active devices
-- select date_trunc('week', occurred_at) as week, count(distinct device_id) as active_devices
-- from public.usage_events group by 1 order by 1 desc;

-- "Real sessions" per week: a device on a day with >= 4 players and >= 1 completed game
-- with day_stats as (
--   select device_id, date_trunc('day', occurred_at) as day,
--          max(players_total) as max_players,
--          count(*) filter (where event = 'game_completed') as games
--   from public.usage_events group by 1, 2
-- )
-- select date_trunc('week', day) as week, count(*) as real_sessions
-- from day_stats where max_players >= 4 and games >= 1 group by 1 order by 1 desc;

-- 30-day return rate: devices with a real session on 2+ different days in the last 30 days
-- with real_days as (
--   select device_id, date_trunc('day', occurred_at) as day
--   from public.usage_events
--   where occurred_at > now() - interval '30 days'
--   group by 1, 2
--   having max(players_total) >= 4 and count(*) filter (where event = 'game_completed') >= 1
-- )
-- select count(*) filter (where days >= 2) as returning_devices, count(*) as devices_with_real_sessions
-- from (select device_id, count(*) as days from real_days group by 1) t;

-- Survey results by role / sport / price
-- select role, would_pay, price_choice, count(*) from public.feedback group by 1,2,3 order by 1,2,3;
-- select unnest(sports) as sport, count(*) from public.feedback group by 1 order by 2 desc;
