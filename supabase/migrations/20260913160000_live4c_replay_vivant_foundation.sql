-- ============================================================================
-- CITADELLE — LIVE 4C
-- REPLAY VIVANT — FOUNDATION
--
-- Additive foundation only.
-- No seed.
-- No destructive table operation.
-- LIVE 4B frozen reaction memory is not modified.
-- ============================================================================

begin;

-- ============================================================================
-- 1. EDITORIAL EXTENSIONS — live_programs
-- ============================================================================

alter table public.live_programs
  add column if not exists program_kind text
  check (
    program_kind is null
    or program_kind in (
      'celebration',
      'teaching',
      'prayer',
      'formation',
      'event',
      'other'
    )
  );

alter table public.live_programs
  add column if not exists platform_slug text;

comment on column public.live_programs.program_kind is
  'LIVE 4C editorial family. Program remains the canonical identity.';

comment on column public.live_programs.platform_slug is
  'Optional specialist platform attachment such as mahanaim.';

-- ============================================================================
-- 2. PROGRAM SEASONS
-- ============================================================================

create table if not exists public.live_program_seasons (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.live_programs(id)
    on delete restrict,
  season_number integer not null
    check (season_number > 0),
  slug text,
  title text not null,
  description text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, season_number),
  unique (program_id, slug)
);

create index if not exists idx_live_program_seasons_program
  on public.live_program_seasons(program_id, sort_order, season_number);

create index if not exists idx_live_program_seasons_status
  on public.live_program_seasons(status);

comment on table public.live_program_seasons is
  'LIVE 4C editorial seasons between live_programs and cms_lives.';

-- Public may only read published editorial seasons.
alter table public.live_program_seasons enable row level security;

revoke all on table public.live_program_seasons
  from anon, authenticated;

grant select on table public.live_program_seasons
  to anon, authenticated;

grant all on table public.live_program_seasons
  to service_role;

drop policy if exists live_program_seasons_public_read
  on public.live_program_seasons;

create policy live_program_seasons_public_read
  on public.live_program_seasons
  for select
  to anon, authenticated
  using (status = 'published');

-- ============================================================================
-- 3. OCCURRENCE EXTENSIONS — cms_lives
-- ============================================================================

alter table public.cms_lives
  add column if not exists season_id uuid
  references public.live_program_seasons(id)
  on delete set null;

alter table public.cms_lives
  add column if not exists episode_number integer
  check (episode_number is null or episode_number > 0);

create index if not exists idx_cms_lives_season_episode
  on public.cms_lives(season_id, episode_number);

comment on column public.cms_lives.season_id is
  'Optional LIVE 4C editorial season.';

comment on column public.cms_lives.episode_number is
  'Optional episode/session number inside a program season.';

-- ============================================================================
-- 4. REPLAY VIEWING MEMORY
-- ============================================================================

create table if not exists public.live_replay_progress (
  cms_live_id uuid not null
    references public.cms_lives(id)
    on delete cascade,
  actor_key text not null
    check (char_length(actor_key) between 8 and 200),
  user_id uuid
    references auth.users(id)
    on delete cascade,
  last_position_seconds integer not null default 0
    check (last_position_seconds >= 0),
  duration_seconds integer
    check (duration_seconds is null or duration_seconds > 0),
  percent_complete numeric(5,2) not null default 0
    check (percent_complete >= 0 and percent_complete <= 100),
  completed_at timestamptz,
  view_count integer not null default 1
    check (view_count > 0),
  last_session_key text
    check (last_session_key is null or char_length(last_session_key) <= 128),
  first_watched_at timestamptz not null default now(),
  last_watched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cms_live_id, actor_key)
);

create index if not exists idx_live_replay_progress_user
  on public.live_replay_progress(user_id, last_watched_at desc)
  where user_id is not null;

create index if not exists idx_live_replay_progress_live
  on public.live_replay_progress(cms_live_id, last_watched_at desc);

comment on table public.live_replay_progress is
  'LIVE 4C replay progress and qualified return memory. Server-owned.';

alter table public.live_replay_progress enable row level security;

revoke all on table public.live_replay_progress
  from anon, authenticated;

grant all on table public.live_replay_progress
  to service_role;

-- ============================================================================
-- 5. REPLAY REACTIONS
-- ============================================================================

create table if not exists public.live_replay_reactions (
  cms_live_id uuid not null
    references public.cms_lives(id)
    on delete cascade,
  actor_key text not null
    check (char_length(actor_key) between 8 and 200),
  user_id uuid
    references auth.users(id)
    on delete cascade,
  reaction text not null
    check (reaction in ('prayer', 'fire', 'heart', 'praise', 'kingdom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cms_live_id, actor_key, reaction)
);

create index if not exists idx_live_replay_reactions_counts
  on public.live_replay_reactions(cms_live_id, reaction);

create index if not exists idx_live_replay_reactions_user
  on public.live_replay_reactions(user_id, cms_live_id)
  where user_id is not null;

comment on table public.live_replay_reactions is
  'LIVE 4C post-live reactions. Never modifies frozen LIVE 4B reaction memory.';

alter table public.live_replay_reactions enable row level security;

revoke all on table public.live_replay_reactions
  from anon, authenticated;

grant all on table public.live_replay_reactions
  to service_role;

-- ============================================================================
-- 6. REPLAY COMMENTS
-- ============================================================================

create table if not exists public.live_replay_comments (
  id uuid primary key default gen_random_uuid(),
  cms_live_id uuid not null
    references public.cms_lives(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  body text not null
    check (char_length(btrim(body)) between 2 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  moderated_by uuid
    references auth.users(id)
    on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_replay_comments_public
  on public.live_replay_comments(cms_live_id, created_at desc)
  where status = 'published';

create index if not exists idx_live_replay_comments_moderation
  on public.live_replay_comments(status, created_at asc);

create index if not exists idx_live_replay_comments_user
  on public.live_replay_comments(user_id, created_at desc);

comment on table public.live_replay_comments is
  'LIVE 4C moderated replay comments. Server-only persistence.';

alter table public.live_replay_comments enable row level security;

revoke all on table public.live_replay_comments
  from anon, authenticated;

grant all on table public.live_replay_comments
  to service_role;

-- ============================================================================
-- 7. MON CARNET DU CULTE
-- ============================================================================

create table if not exists public.live_cult_notes (
  id uuid primary key default gen_random_uuid(),
  cms_live_id uuid not null
    references public.cms_lives(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  kind text not null default 'note'
    check (kind in ('note', 'bookmark', 'scripture')),
  body text not null
    check (char_length(btrim(body)) between 1 and 10000),
  position_seconds integer
    check (position_seconds is null or position_seconds >= 0),
  scripture_reference text
    check (
      scripture_reference is null
      or char_length(scripture_reference) <= 200
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_cult_notes_owner
  on public.live_cult_notes(user_id, cms_live_id, created_at asc);

create index if not exists idx_live_cult_notes_position
  on public.live_cult_notes(user_id, cms_live_id, position_seconds)
  where position_seconds is not null;

comment on table public.live_cult_notes is
  'LIVE 4C private member notebook. Never public by default.';

alter table public.live_cult_notes enable row level security;

revoke all on table public.live_cult_notes
  from anon, authenticated;

grant all on table public.live_cult_notes
  to service_role;

-- ============================================================================
-- 8. EXPLICIT NON-DOMAINS
-- ============================================================================
--
-- No replay prayer table.
-- No replay pastoral message table.
-- No replay giving table.
-- No replay share table.
-- No spiritual decision table in this foundation.
-- No replay aggregate counter table.
--
-- Existing systems remain canonical:
--   priere_demandes
--   messages
--   LiveOffering / dons / giving_transactions_log / Chariow
--   /api/live/share
--

commit;
