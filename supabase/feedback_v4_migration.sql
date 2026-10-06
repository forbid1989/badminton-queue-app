-- Migration v4: region / group type / group size, new price ranges, running-cost feature.
-- Run in the Supabase SQL Editor AFTER feedback_v2 and feedback_v3 migrations. Safe to re-run.
-- Existing rows stay valid: old price values are still allowed, and survey_version tells the
-- two survey generations apart (rows from before this migration default to version 1).

alter table public.feedback
  add column if not exists region text,
  add column if not exists group_type text,
  add column if not exists players_per_session text,
  add column if not exists survey_version smallint not null default 1;

alter table public.feedback
  drop constraint if exists feedback_region_check,
  drop constraint if exists feedback_group_type_check,
  drop constraint if exists feedback_players_per_session_check,
  drop constraint if exists feedback_survey_version_check,
  drop constraint if exists feedback_price_choice_check,
  drop constraint if exists feedback_top_features_check;

alter table public.feedback
  add constraint feedback_region_check
    check (region is null or region in ('metro_manila','luzon_other','visayas','mindanao','other')),
  add constraint feedback_group_type_check
    check (group_type is null or group_type in ('students','working_adults','mixed')),
  add constraint feedback_players_per_session_check
    check (players_per_session is null or players_per_session in ('lt_10','10_19','20_29','30_plus')),
  add constraint feedback_survey_version_check
    check (survey_version between 1 and 10),
  -- New ranges (survey v2) plus the old values so earlier rows remain valid
  add constraint feedback_price_choice_check
    check (
      price_choice is null or price_choice in (
        'lt_100','100_199','200_299','300_499','500_749','750_999','1000_plus',
        'under_100','100','150','250','400','over_400'
      )
    ),
  add constraint feedback_top_features_check
    check (
      cardinality(top_features) <= 3
      and top_features <@ array[
        'auto_queue','leaderboard','mmr','win_stats','live_session',
        'match_history','match_request','running_cost','other'
      ]
    );

-- ---------- Handy queries (survey v2 only) ----------

-- Price choice by region and group type, among people who said yes/maybe to a paid plan
-- select region, group_type, price_choice, count(*)
-- from public.feedback
-- where survey_version = 2 and would_pay in ('yes','maybe')
-- group by 1,2,3 order by 1,2,3;

-- Paid-plan interest by role
-- select role, would_pay, count(*)
-- from public.feedback where survey_version = 2 group by 1,2 order by 1,2;

-- Feature votes by group type
-- select group_type, unnest(top_features) as feature, count(*)
-- from public.feedback where survey_version = 2 group by 1,2 order by 1,3 desc;

-- Organizer responses only, with contact info for early-access follow-up
-- select created_at, region, group_type, players_per_session, would_pay, price_choice, email, message
-- from public.feedback
-- where survey_version = 2 and role in ('organizer','owner') and not is_anonymous
-- order by created_at desc;
