-- Feedback v2: structured survey fields
-- Run in the Supabase SQL Editor. Existing rows stay valid (new columns are nullable).

alter table public.feedback
  alter column category drop not null,
  alter column message drop not null;

alter table public.feedback
  drop constraint if exists feedback_category_check,
  drop constraint if exists feedback_message_check;

alter table public.feedback
  add column if not exists role text,
  add column if not exists top_features text[] not null default '{}',
  add column if not exists feature_other text,
  add column if not exists would_pay text,
  add column if not exists price_choice text,
  add column if not exists wants_early_access boolean not null default false;

alter table public.feedback
  drop constraint if exists feedback_role_check,
  drop constraint if exists feedback_would_pay_check,
  drop constraint if exists feedback_price_choice_check,
  drop constraint if exists feedback_top_features_check,
  drop constraint if exists feedback_feature_other_check;

alter table public.feedback
  add constraint feedback_category_check
    check (category is null or category in ('feature','bug','pricing','other')),
  add constraint feedback_message_check
    check (message is null or char_length(message) between 10 and 2000),
  add constraint feedback_role_check
    check (role is null or role in ('organizer','player','owner','other')),
  add constraint feedback_would_pay_check
    check (would_pay is null or would_pay in ('yes','maybe','no')),
  add constraint feedback_price_choice_check
    check (price_choice is null or price_choice in ('under_100','100','150','250','400','over_400')),
  add constraint feedback_top_features_check
    check (
      cardinality(top_features) <= 3
      and top_features <@ array['auto_queue','leaderboard','mmr','win_stats','live_session','match_history','match_request','other']
    ),
  add constraint feedback_feature_other_check
    check (feature_other is null or char_length(feature_other) <= 200);

-- Handy query: paid-plan interest by role
-- select role, would_pay, price_choice, count(*) from public.feedback group by 1,2,3 order by 1,2,3;
