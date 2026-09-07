-- CITADELLE — LIVE 4A.1
-- Fondation de présence réelle.
-- Migration créée dans ce lot mais NON appliquée à Supabase.

begin;

create table if not exists public.live_presence_sessions (
  id uuid primary key default gen_random_uuid(),

  live_key text not null
    check (
      live_key ~ '^youtube:[A-Za-z0-9_-]{11}$'
    ),

  participant_kind text not null
    check (
      participant_kind in ('member','guest')
    ),

  user_id uuid,

  guest_session_hash text
    check (
      guest_session_hash is null
      or guest_session_hash ~ '^[0-9a-f]{64}$'
    ),

  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint live_presence_identity_valid
    check (
      (
        participant_kind = 'member'
        and user_id is not null
        and guest_session_hash is null
      )
      or
      (
        participant_kind = 'guest'
        and user_id is null
        and guest_session_hash is not null
      )
    ),

  constraint live_presence_time_valid
    check (
      last_seen_at >= joined_at
    )
);

create unique index if not exists idx_live_presence_member_unique
  on public.live_presence_sessions (live_key, user_id)
  where participant_kind = 'member'
    and user_id is not null;

create unique index if not exists idx_live_presence_guest_unique
  on public.live_presence_sessions (live_key, guest_session_hash)
  where participant_kind = 'guest'
    and guest_session_hash is not null;

create index if not exists idx_live_presence_last_seen
  on public.live_presence_sessions (
    live_key,
    last_seen_at desc
  );

create index if not exists idx_live_presence_kind_last_seen
  on public.live_presence_sessions (
    live_key,
    participant_kind,
    last_seen_at desc
  );

create table if not exists public.live_share_actions (
  id uuid primary key default gen_random_uuid(),

  live_key text not null
    check (
      live_key ~ '^youtube:[A-Za-z0-9_-]{11}$'
    ),

  participant_kind text not null
    check (
      participant_kind in ('member','guest')
    ),

  user_id uuid,

  guest_session_hash text
    check (
      guest_session_hash is null
      or guest_session_hash ~ '^[0-9a-f]{64}$'
    ),

  action_kind text not null
    check (
      action_kind in ('native_share','copy_link')
    ),

  created_at timestamptz not null default now(),

  constraint live_share_identity_valid
    check (
      (
        participant_kind = 'member'
        and user_id is not null
        and guest_session_hash is null
      )
      or
      (
        participant_kind = 'guest'
        and user_id is null
        and guest_session_hash is not null
      )
    )
);

create index if not exists idx_live_share_live_created
  on public.live_share_actions (
    live_key,
    created_at desc
  );

create index if not exists idx_live_share_kind_created
  on public.live_share_actions (
    live_key,
    action_kind,
    created_at desc
  );

alter table public.live_presence_sessions
  enable row level security;

alter table public.live_share_actions
  enable row level security;

revoke all on table public.live_presence_sessions
  from anon, authenticated;

revoke all on table public.live_share_actions
  from anon, authenticated;

grant select, insert, update, delete
  on table public.live_presence_sessions
  to service_role;

grant select, insert, update, delete
  on table public.live_share_actions
  to service_role;

commit;

-- Rollback de référence uniquement :
-- drop table if exists public.live_share_actions;
-- drop table if exists public.live_presence_sessions;